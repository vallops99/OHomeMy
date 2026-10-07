"""The published document's store: revision, conflict, migration, history."""

from pathlib import Path
from typing import Any

import pytest
from homeassistant.core import HomeAssistant
from homeassistant.helpers.storage import UnsupportedStorageVersionError
from homeassistant.setup import async_setup_component

from custom_components.ohomemy import store as store_module
from custom_components.ohomemy.const import DATA_PUBLISHED
from custom_components.ohomemy.document import InvalidDocument, validate
from custom_components.ohomemy.store import (
    HISTORY_SIZE,
    Conflict,
    Published,
    UnsupportedVersion,
)

from .documents import dashboard, house

DOCUMENT_KEY = "ohomemy.document"
HISTORY_KEY = "ohomemy.history"


async def loaded(hass: HomeAssistant) -> Published:
    published = Published(hass)
    await published.async_load()
    return published


async def test_nothing_stored_is_revision_0_with_no_dashboards(
    hass: HomeAssistant, hass_storage: dict[str, Any]
) -> None:
    published = await loaded(hass)
    assert published.revision == 0
    assert published.document == {"dashboards": []}


async def test_a_publish_is_written_at_once_with_the_next_revision(
    hass: HomeAssistant, hass_storage: dict[str, Any]
) -> None:
    published = await loaded(hass)
    assert await published.async_publish(house(), 0, "admin") == 1

    # Immediately: no delayed save is pending.
    stored = hass_storage[DOCUMENT_KEY]
    assert (stored["version"], stored["minor_version"]) == (2, 1)
    assert stored["data"] == {"revision": 1, "document": house()}

    again = await loaded(hass)
    assert (again.revision, again.document) == (1, house())


async def test_a_stale_base_revision_is_a_conflict_and_writes_nothing(
    hass: HomeAssistant, hass_storage: dict[str, Any]
) -> None:
    published = await loaded(hass)
    await published.async_publish(house(), 0, "a")

    other = {"dashboards": [dashboard("other")]}
    with pytest.raises(Conflict) as err:
        await published.async_publish(other, 0, "b")
    assert err.value.revision == 1
    assert published.document == house()
    assert hass_storage[DOCUMENT_KEY]["data"]["revision"] == 1


async def test_two_publishes_from_one_base_let_only_the_first_through(
    hass: HomeAssistant, hass_storage: dict[str, Any]
) -> None:
    published = await loaded(hass)
    first = hass.async_create_task(published.async_publish(house(), 0, "a"))
    second = hass.async_create_task(published.async_publish({"dashboards": []}, 0, "b"))
    assert await first == 1
    with pytest.raises(Conflict):
        await second


async def test_an_invalid_document_is_refused_and_writes_nothing(
    hass: HomeAssistant, hass_storage: dict[str, Any]
) -> None:
    published = await loaded(hass)
    with pytest.raises(InvalidDocument):
        await published.async_publish({"dashboards": [{}]}, 0, "a")
    assert published.revision == 0
    assert DOCUMENT_KEY not in hass_storage


async def test_renaming_a_dashboards_slug_is_refused(
    hass: HomeAssistant, hass_storage: dict[str, Any]
) -> None:
    published = await loaded(hass)
    await published.async_publish(house(), 0, "a")
    renamed = house()
    renamed["dashboards"][0]["slug"] = "entrance"
    with pytest.raises(InvalidDocument):
        await published.async_publish(renamed, 1, "a")


async def test_listeners_hear_every_publish(
    hass: HomeAssistant, hass_storage: dict[str, Any]
) -> None:
    published = await loaded(hass)
    heard: list[tuple[int, Any]] = []
    unsubscribe = published.async_listen(lambda r, d: heard.append((r, d)))
    await published.async_publish(house(), 0, "a")
    unsubscribe()
    await published.async_publish({"dashboards": []}, 1, "a")
    assert heard == [(1, house())]


async def test_history_keeps_the_last_publishes_newest_first(
    hass: HomeAssistant, hass_storage: dict[str, Any]
) -> None:
    published = await loaded(hass)
    for revision in range(HISTORY_SIZE + 3):
        doc = {"dashboards": [dashboard(f"d{revision}")]}
        await published.async_publish(doc, revision, "admin")

    history = published.history
    assert len(history) == HISTORY_SIZE
    assert [h["revision"] for h in history[:2]] == [HISTORY_SIZE + 3, HISTORY_SIZE + 2]
    assert history[0]["user_id"] == "admin"
    assert history[0]["document"]["dashboards"][0]["id"] == f"d{HISTORY_SIZE + 2}"
    assert history[0]["saved_at"]

    again = await loaded(hass)
    assert again.history == history


async def test_an_old_publish_from_history_can_be_published_again(
    hass: HomeAssistant, hass_storage: dict[str, Any]
) -> None:
    published = await loaded(hass)
    await published.async_publish(house(), 0, "a")
    await published.async_publish({"dashboards": []}, 1, "a")
    undo = published.history[1]["document"]
    assert await published.async_publish(undo, 2, "a") == 3
    assert published.document == house()


async def test_a_recorder_adds_to_the_history_entry_before_it_is_saved(
    hass: HomeAssistant, hass_storage: dict[str, Any]
) -> None:
    published = await loaded(hass)
    heard: list[Any] = []

    async def recorder(
        before: dict[str, Any], after: dict[str, Any]
    ) -> dict[str, Any]:
        # After the listeners, and with the history as it was before this Publish.
        heard.append((published.document is after, len(published.history)))
        return {"seen": [len(before["dashboards"]), len(after["dashboards"])]}

    published.async_record(recorder)
    await published.async_publish(house(), 0, "a")

    assert heard == [(True, 0)]
    stored = hass_storage[HISTORY_KEY]["data"]["entries"][0]
    assert stored["revision"] == 1
    assert stored["seen"] == [0, len(house()["dashboards"])]


async def test_a_failing_recorder_loses_neither_the_publish_nor_its_entry(
    hass: HomeAssistant, hass_storage: dict[str, Any]
) -> None:
    published = await loaded(hass)

    async def recorder(
        before: dict[str, Any], after: dict[str, Any]
    ) -> dict[str, Any]:
        raise RuntimeError("broken")

    published.async_record(recorder)
    assert await published.async_publish(house(), 0, "a") == 1
    assert hass_storage[HISTORY_KEY]["data"]["entries"][0]["revision"] == 1


@pytest.fixture
def minor_version_2(monkeypatch: pytest.MonkeyPatch) -> None:
    """A later OHomeMy at 2.2, whose next migration renames every Dashboard."""

    def rename(document: dict[str, Any]) -> dict[str, Any]:
        return {
            "dashboards": [
                d | {"name": f"{d['name']} (2.2)"} for d in document["dashboards"]
            ]
        }

    monkeypatch.setattr(store_module, "MINOR_VERSION", 2)
    monkeypatch.setattr(
        store_module, "MIGRATIONS", [*store_module.MIGRATIONS, ((2, 2), rename)]
    )


def following_the_device_as_auto() -> dict[str, Any]:
    """`house()` as version 1 wrote it, when `follow-device` was `auto`."""
    old = house()
    for d in old["dashboards"]:
        d["settings"]["theme"]["mode"] = "auto"
    old["dashboards"][1]["settings"]["theme"]["mode"] = "light"
    return old


def stored(key: str, version: int, minor: int, data: dict[str, Any]) -> dict[str, Any]:
    return {"version": version, "minor_version": minor, "key": key, "data": data}


async def test_an_older_stored_document_is_migrated_on_load_and_saved(
    hass: HomeAssistant, hass_storage: dict[str, Any], minor_version_2: None
) -> None:
    hass_storage[DOCUMENT_KEY] = {
        "version": 2,
        "minor_version": 1,
        "key": DOCUMENT_KEY,
        "data": {"revision": 7, "document": house()},
    }
    hass_storage[HISTORY_KEY] = {
        "version": 2,
        "minor_version": 1,
        "key": HISTORY_KEY,
        "data": {
            "entries": [
                {"revision": 7, "saved_at": "x", "user_id": None, "document": house()}
            ]
        },
    }

    published = await loaded(hass)

    assert published.revision == 7
    assert published.document["dashboards"][0]["name"] == "Wall (2.2)"
    assert published.history[0]["document"]["dashboards"][0]["name"] == "Wall (2.2)"
    stored = hass_storage[DOCUMENT_KEY]
    assert stored["minor_version"] == 2
    assert stored["data"]["document"]["dashboards"][0]["name"] == "Wall (2.2)"


async def test_a_document_from_a_newer_major_version_is_not_loaded(
    hass: HomeAssistant, hass_storage: dict[str, Any]
) -> None:
    hass_storage[DOCUMENT_KEY] = {
        "version": 3,
        "minor_version": 1,
        "key": DOCUMENT_KEY,
        "data": {"revision": 3, "document": {"boards": []}},
    }
    with pytest.raises(UnsupportedStorageVersionError):
        await loaded(hass)


async def test_an_export_imports_as_a_new_revision(
    hass: HomeAssistant, hass_storage: dict[str, Any]
) -> None:
    published = await loaded(hass)
    await published.async_publish(house(), 0, "a")
    exported = published.export()
    assert exported == {
        "version": 2,
        "minor_version": 1,
        "revision": 1,
        "document": house(),
    }

    await published.async_publish({"dashboards": []}, 1, "a")
    assert await published.async_import(exported, 2, "a") == 3
    assert published.document == house()


async def test_an_older_export_is_migrated_before_it_is_imported(
    hass: HomeAssistant, hass_storage: dict[str, Any], minor_version_2: None
) -> None:
    published = await loaded(hass)
    exported = {"version": 2, "minor_version": 1, "revision": 9, "document": house()}
    assert await published.async_import(exported, 0, "a") == 1
    assert published.document["dashboards"][0]["name"] == "Wall (2.2)"


@pytest.mark.parametrize(
    "exported",
    [
        {"version": 3, "minor_version": 1, "revision": 1, "document": {}},
        {"dashboards": []},
        "not json",
    ],
)
async def test_an_export_this_ohomemy_cannot_read_is_refused(
    hass: HomeAssistant, hass_storage: dict[str, Any], exported: Any
) -> None:
    published = await loaded(hass)
    with pytest.raises(UnsupportedVersion):
        await published.async_import(exported, 0, "a")
    assert published.revision == 0


async def test_setting_up_loads_the_stored_document(
    hass: HomeAssistant, hass_storage: dict[str, Any], built: Path
) -> None:
    hass_storage[DOCUMENT_KEY] = {
        "version": 2,
        "minor_version": 1,
        "key": DOCUMENT_KEY,
        "data": {"revision": 4, "document": house()},
    }
    assert await async_setup_component(hass, "ohomemy", {})
    assert hass.data[DATA_PUBLISHED].revision == 4


async def test_a_version_1_document_following_the_device_as_auto_loads_as_follow_device(
    hass: HomeAssistant, hass_storage: dict[str, Any]
) -> None:
    hass_storage[DOCUMENT_KEY] = stored(
        DOCUMENT_KEY, 1, 1, {"revision": 5, "document": following_the_device_as_auto()}
    )
    entry = {"revision": 5, "saved_at": "x", "user_id": "a"}
    hass_storage[HISTORY_KEY] = stored(
        HISTORY_KEY,
        1,
        1,
        {
            "entries": [
                # A field a recorder added (#67) rides along untouched.
                entry
                | {
                    "document": following_the_device_as_auto(),
                    "cleared_defaults": [{"user_id": "u1", "dashboard": "lovelace"}],
                },
                entry | {"revision": 4, "document": {"dashboards": []}},
            ]
        },
    )

    published = await loaded(hass)

    modes = lambda doc: [d["settings"]["theme"]["mode"] for d in doc["dashboards"]]
    assert published.revision == 5
    assert modes(published.document) == ["follow-device", "light"]
    expected = house()
    expected["dashboards"][1]["settings"]["theme"]["mode"] = "light"
    assert published.document == expected
    validate(published.document)
    newest, older = published.history
    assert modes(newest["document"]) == ["follow-device", "light"]
    assert newest["cleared_defaults"] == [{"user_id": "u1", "dashboard": "lovelace"}]
    assert (newest["revision"], newest["saved_at"], newest["user_id"]) == (5, "x", "a")
    assert older["document"] == {"dashboards": []}

    # Saved at the new major version, so the next load needs no migration.
    for key in (DOCUMENT_KEY, HISTORY_KEY):
        assert (hass_storage[key]["version"], hass_storage[key]["minor_version"]) == (
            2,
            1,
        )
    assert modes(hass_storage[DOCUMENT_KEY]["data"]["document"]) == [
        "follow-device",
        "light",
    ]


async def test_a_version_1_export_following_the_device_as_auto_imports_as_follow_device(
    hass: HomeAssistant, hass_storage: dict[str, Any]
) -> None:
    published = await loaded(hass)
    exported = {
        "version": 1,
        "minor_version": 1,
        "revision": 9,
        "document": following_the_device_as_auto(),
    }
    assert await published.async_import(exported, 0, "a") == 1
    assert published.document["dashboards"][0]["settings"]["theme"] == {
        "name": "casa-panel",
        "mode": "follow-device",
    }


def test_the_rename_leaves_every_other_mode_and_field_alone() -> None:
    doc = house()
    doc["dashboards"][0]["settings"]["theme"] = {
        "name": "casa-panel",
        "mode": "follow-house",
        "entity": "sun.sun",
    }
    assert store_module.migrate(1, 1, doc) == doc

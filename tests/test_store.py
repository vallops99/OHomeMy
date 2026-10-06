"""The published document's store: revision, conflict, migration, history."""

from pathlib import Path
from typing import Any

import pytest
from homeassistant.core import HomeAssistant
from homeassistant.helpers.storage import UnsupportedStorageVersionError
from homeassistant.setup import async_setup_component

from custom_components.ohomemy import store as store_module
from custom_components.ohomemy.const import DATA_PUBLISHED
from custom_components.ohomemy.document import InvalidDocument
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
    assert (stored["version"], stored["minor_version"]) == (1, 1)
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


@pytest.fixture
def minor_version_2(monkeypatch: pytest.MonkeyPatch) -> None:
    """A later OHomeMy at 1.2, whose one migration renames every Dashboard."""

    def rename(document: dict[str, Any]) -> dict[str, Any]:
        return {
            "dashboards": [
                d | {"name": f"{d['name']} (1.2)"} for d in document["dashboards"]
            ]
        }

    monkeypatch.setattr(store_module, "MINOR_VERSION", 2)
    monkeypatch.setattr(store_module, "MIGRATIONS", [((1, 2), rename)])


async def test_an_older_stored_document_is_migrated_on_load_and_saved(
    hass: HomeAssistant, hass_storage: dict[str, Any], minor_version_2: None
) -> None:
    hass_storage[DOCUMENT_KEY] = {
        "version": 1,
        "minor_version": 1,
        "key": DOCUMENT_KEY,
        "data": {"revision": 7, "document": house()},
    }
    hass_storage[HISTORY_KEY] = {
        "version": 1,
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
    assert published.document["dashboards"][0]["name"] == "Wall (1.2)"
    assert published.history[0]["document"]["dashboards"][0]["name"] == "Wall (1.2)"
    stored = hass_storage[DOCUMENT_KEY]
    assert stored["minor_version"] == 2
    assert stored["data"]["document"]["dashboards"][0]["name"] == "Wall (1.2)"


async def test_a_document_from_a_newer_major_version_is_not_loaded(
    hass: HomeAssistant, hass_storage: dict[str, Any]
) -> None:
    hass_storage[DOCUMENT_KEY] = {
        "version": 2,
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
        "version": 1,
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
    exported = {"version": 1, "minor_version": 1, "revision": 9, "document": house()}
    assert await published.async_import(exported, 0, "a") == 1
    assert published.document["dashboards"][0]["name"] == "Wall (1.2)"


@pytest.mark.parametrize(
    "exported",
    [
        {"version": 2, "minor_version": 1, "revision": 1, "document": {}},
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
        "version": 1,
        "minor_version": 1,
        "key": DOCUMENT_KEY,
        "data": {"revision": 4, "document": house()},
    }
    assert await async_setup_component(hass, "ohomemy", {})
    assert hass.data[DATA_PUBLISHED].revision == 4

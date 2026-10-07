"""The document's structure, as the server checks it before a Publish."""

from collections.abc import Callable
from typing import Any

import pytest

from custom_components.ohomemy.document import (
    InvalidDocument,
    check_transition,
    empty_document,
    validate,
)

from .documents import dashboard, house, page, widget


def test_the_empty_document_is_sound() -> None:
    validate(empty_document())


def test_a_document_using_every_part_is_sound() -> None:
    validate(house())


def test_any_kind_and_any_settings_are_kept() -> None:
    # Which kinds exist, and what their settings mean, is the TypeScript
    # schema module's business.
    doc = {
        "dashboards": [
            dashboard(
                pages=[
                    page(
                        widgets=[
                            widget(
                                kind="not-yet-invented",
                                settings={"anything": [1, {"x": None}]},
                            )
                        ]
                    )
                ]
            )
        ]
    }
    validate(doc)


def broken(path: str, change: Callable[[dict[str, Any]], None]) -> Any:
    return pytest.param(path, change, id=path)


@pytest.mark.parametrize(
    ("path", "change"),
    [
        broken("dashboards", lambda doc: doc.update(dashboards={})),
        broken("dashboards[0]", lambda doc: doc["dashboards"][0].update(extra=1)),
        broken("dashboards[0]", lambda doc: doc["dashboards"][0].pop("navbar")),
        broken("dashboards[0].id", lambda doc: doc["dashboards"][0].update(id="")),
        broken(
            "dashboards[0].slug",
            lambda doc: doc["dashboards"][0].update(slug="Wall Panel"),
        ),
        broken(
            "dashboards[0].slug",
            lambda doc: doc["dashboards"][0].update(slug="wall--panel"),
        ),
        broken(
            "dashboards[1].slug", lambda doc: doc["dashboards"][1].update(slug="wall")
        ),
        broken("dashboards[1].id", lambda doc: doc["dashboards"][1].update(id="wall")),
        broken(
            "dashboards[0].show_in_sidebar",
            lambda doc: doc["dashboards"][0].update(show_in_sidebar=1),
        ),
        broken(
            "dashboards[0].settings.overflow",
            lambda doc: doc["dashboards"][0]["settings"].update(overflow="zoom"),
        ),
        broken(
            "dashboards[0].settings.supported_range",
            lambda doc: doc["dashboards"][0]["settings"]["supported_range"][
                "min"
            ].update(width=2000),
        ),
        broken(
            "dashboards[0].settings.idle_return",
            lambda doc: doc["dashboards"][0]["settings"].update(idle_return=0),
        ),
        broken(
            "dashboards[0].settings.theme.mode",
            lambda doc: doc["dashboards"][0]["settings"]["theme"].update(mode="sepia"),
        ),
        broken(
            "dashboards[0].pages", lambda doc: doc["dashboards"][0].update(pages=[])
        ),
        broken(
            "dashboards[0].home_page",
            lambda doc: doc["dashboards"][0].update(home_page="nowhere"),
        ),
        broken(
            "dashboards[0].home_page",
            lambda doc: doc["dashboards"][0].update(home_page="doorbell"),
        ),
        broken(
            "dashboards[0].pages[1].id",
            lambda doc: doc["dashboards"][0]["pages"][1].update(id="home"),
        ),
        broken(
            "dashboards[0].pages[2].popup",
            lambda doc: doc["dashboards"][0]["pages"][1].update(popup="doorbell"),
        ),
        broken(
            "dashboards[0].pages[2].popup",
            lambda doc: doc["dashboards"][0]["pages"][2].update(popup="none"),
        ),
        broken(
            "dashboards[0].pages[0].grid.columns",
            lambda doc: doc["dashboards"][0]["pages"][0]["grid"].update(columns=0),
        ),
        broken(
            "dashboards[0].navbar.edge",
            lambda doc: doc["dashboards"][0]["navbar"].update(edge="middle"),
        ),
        broken(
            "dashboards[0].navbar.items[1].page",
            lambda doc: doc["dashboards"][0]["navbar"]["items"][1].update(
                page="doorbell"
            ),
        ),
        broken(
            "dashboards[0].navbar.items[1].id",
            lambda doc: doc["dashboards"][0]["navbar"]["items"][1].update(id="n1"),
        ),
        broken(
            "dashboards[0].pages[0].widgets[1].id",
            lambda doc: doc["dashboards"][0]["pages"][0]["widgets"][1].update(
                id="clock"
            ),
        ),
        # Widget ids are unique across the Dashboard, so a move between Pages keeps one.
        broken(
            "dashboards[0].pages[1].widgets[0].id",
            lambda doc: doc["dashboards"][0]["pages"][1]["widgets"][0].update(
                id="clock"
            ),
        ),
        broken(
            "dashboards[0].pages[0].widgets[0].kind",
            lambda doc: doc["dashboards"][0]["pages"][0]["widgets"][0].update(
                kind=None
            ),
        ),
        broken(
            "dashboards[0].pages[0].widgets[0].w",
            lambda doc: doc["dashboards"][0]["pages"][0]["widgets"][0].update(w=True),
        ),
        broken(
            "dashboards[0].pages[0].widgets[0].x",
            lambda doc: doc["dashboards"][0]["pages"][0]["widgets"][0].update(x=-1),
        ),
        broken(
            "dashboards[0].pages[0].widgets[0]",
            lambda doc: doc["dashboards"][0]["pages"][0]["widgets"][0].update(x=11),
        ),
        broken(
            "dashboards[0].pages[0].widgets[0]",
            lambda doc: doc["dashboards"][0]["pages"][0]["widgets"][0].update(y=8),
        ),
        broken(
            "dashboards[0].pages[0].widgets[0].variant",
            lambda doc: doc["dashboards"][0]["pages"][0]["widgets"][0].update(
                variant="tiny"
            ),
        ),
        broken(
            "dashboards[0].pages[0].widgets[0].title",
            lambda doc: doc["dashboards"][0]["pages"][0]["widgets"][0].update(title=3),
        ),
        broken(
            "dashboards[0].pages[0].widgets[0].on_tap",
            lambda doc: doc["dashboards"][0]["pages"][0]["widgets"][0].update(
                on_tap="doorbell"
            ),
        ),
        broken(
            "dashboards[0].pages[0].widgets[0].settings",
            lambda doc: doc["dashboards"][0]["pages"][0]["widgets"][0].update(
                settings=[]
            ),
        ),
    ],
)
def test_a_broken_document_is_refused_at_its_path(
    path: str, change: Callable[[dict[str, Any]], None]
) -> None:
    doc = house()
    change(doc)
    with pytest.raises(InvalidDocument) as err:
        validate(doc)
    assert err.value.path == path


def test_a_scrolling_dashboard_lets_widgets_run_below_the_screen() -> None:
    doc = house()
    doc["dashboards"][1]["pages"][0]["widgets"] = [widget(y=30)]
    validate(doc)


def test_an_empty_title_is_a_title_someone_wrote() -> None:
    doc = house()
    doc["dashboards"][0]["pages"][0]["widgets"][0]["title"] = ""
    validate(doc)


def test_a_widget_may_open_a_page_further_down() -> None:
    validate(house())  # `to-salone` on the Home Page opens the next Page.


def test_a_slug_is_fixed_once_the_dashboard_exists() -> None:
    old = house()
    new = house()
    new["dashboards"][0]["slug"] = "entrance"
    new["dashboards"][0]["name"] = "Entrance"
    with pytest.raises(InvalidDocument) as err:
        check_transition(old, new)
    assert err.value.path == "dashboards[0].slug"


def test_a_renamed_dashboard_keeps_its_slug_and_a_new_one_takes_a_freed_slug() -> None:
    old = house()
    new = house()
    new["dashboards"][0]["name"] = "Entrance"
    new["dashboards"][1] = dashboard("tablet", slug="phone")
    check_transition(old, new)


def themed(**theme: Any) -> dict[str, Any]:
    doc = house()
    doc["dashboards"][0]["settings"]["theme"] = {"name": "casa-panel", **theme}
    return doc


@pytest.mark.parametrize("mode", ["light", "dark", "follow-device"])
def test_a_mode_that_reads_no_entity_is_sound(mode: str) -> None:
    validate(themed(mode=mode))


@pytest.mark.parametrize(
    "entity", ["sun.sun", "binary_sensor.dark_outside", "input_boolean.night"]
)
def test_following_the_house_reads_a_sun_binary_sensor_or_boolean(
    entity: str,
) -> None:
    validate(themed(mode="follow-house", entity=entity))


@pytest.mark.parametrize(
    "theme",
    [
        {"mode": "follow-house"},
        {"mode": "follow-house", "entity": "sensor.lux"},
        {"mode": "follow-house", "entity": "light.kitchen"},
        {"mode": "follow-house", "entity": "sun"},
        {"mode": "follow-house", "entity": "sun."},
        {"mode": "follow-house", "entity": 3},
        {"mode": "dark", "entity": "sun.sun"},
        {"mode": "follow-device", "entity": "sun.sun"},
        {"mode": "auto"},
    ],
)
def test_the_house_entity_is_there_exactly_when_the_mode_follows_the_house(
    theme: dict[str, Any],
) -> None:
    with pytest.raises(InvalidDocument) as err:
        validate(themed(**theme))
    assert err.value.path.startswith("dashboards[0].settings.theme")

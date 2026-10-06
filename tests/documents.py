"""Documents for the tests: one sound Dashboard to start from and break."""

from typing import Any


def widget(id: str = "clock", **overrides: Any) -> dict[str, Any]:
    return {
        "id": id,
        "kind": "clock",
        "x": 0,
        "y": 0,
        "w": 2,
        "h": 1,
        "variant": "full",
        "title": None,
        "on_tap": None,
        "settings": {},
    } | overrides


def page(id: str = "home", **overrides: Any) -> dict[str, Any]:
    return {
        "id": id,
        "name": id.capitalize(),
        "popup": None,
        "grid": {"columns": 12, "rows": 8},
        "widgets": [],
    } | overrides


def dashboard(id: str = "wall", **overrides: Any) -> dict[str, Any]:
    return {
        "id": id,
        "slug": id,
        "name": id.capitalize(),
        "show_in_sidebar": True,
        "home_page": "home",
        "settings": {
            "overflow": "fit",
            "supported_range": {
                "min": {"width": 1024, "height": 600},
                "max": {"width": 1280, "height": 800},
            },
            "idle_return": 60,
            "back_history": True,
            "theme": {"name": "casa-panel", "mode": "auto"},
        },
        "navbar": None,
        "pages": [page()],
    } | overrides


def house() -> dict[str, Any]:
    """A document using every part of the shape at least once."""
    return {
        "dashboards": [
            dashboard(
                navbar={
                    "edge": "bottom",
                    "tabs": True,
                    "items": [
                        {"id": "n1", "page": "home", "icon": "mdi:home"},
                        {"id": "n2", "page": "salone", "icon": "mdi:sofa"},
                    ],
                },
                pages=[
                    page(
                        widgets=[
                            widget(),
                            widget(
                                "to-salone",
                                kind="link",
                                x=2,
                                w=3,
                                h=2,
                                title="Salone",
                                on_tap="salone",
                                settings={"icon": "mdi:sofa"},
                            ),
                        ]
                    ),
                    page(
                        "salone",
                        widgets=[
                            widget(
                                "room",
                                kind="room_tile",
                                variant="compact",
                                settings={"area": "salone"},
                            )
                        ],
                    ),
                    page("doorbell", popup="doorbell"),
                ],
            ),
            dashboard(
                "phone",
                settings=dashboard()["settings"]
                | {"overflow": "scroll", "idle_return": None},
            ),
        ]
    }

"""The OHomeMy document: every Dashboard, in one JSON value (ADR-0015).

`ha-dashboard/src/document/types.ts` is the definition both sides share, and
says what each field means. This module checks a document's *structure*
before it is published, in plain Python: HA core is moving from voluptuous to
probatio, so the integration depends on neither.

Structure means what any reader of the document relies on:

- every field present, of its type, from its vocabulary, and no other field;
- ids unique where they are looked up (a Dashboard's id and slug in the
  document; a Page's id, a Widget's id and a Popup name in their Dashboard);
- every reference to a Page (the Home Page, a Navbar item, a Widget's on tap)
  naming an ordinary Page of the same Dashboard, never a Popup's;
- every Widget inside its Page's columns, and inside its rows when the
  Dashboard fits Pages to the screen.

What a Widget's `kind` and `settings` may be is not structure. The shared
TypeScript schema module owns that: the Builder offers only valid choices and
the renderer skips an invalid Widget, so the server keeps any kind string and
any settings object. References to entities and Areas are not checked either:
HA's registries change underneath the document, and the renderer drops what
no longer exists rather than the document being rewritten.
"""

from __future__ import annotations

import re
from typing import Any

OVERFLOWS = ("fit", "scroll")
MODES = ("light", "dark", "auto")
EDGES = ("top", "bottom", "left", "right")
VARIANTS = ("full", "compact")

SLUG = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
MAX_ID = 64
MAX_SLUG = 40
MAX_GRID = 96

# `select.ohomemy_popup`'s option for no Popup open, so no Popup may take it.
NO_POPUP = "none"


class InvalidDocument(Exception):
    """The document's structure is wrong at `path`."""

    def __init__(self, path: str, problem: str) -> None:
        super().__init__(f"{path}: {problem}" if path else problem)
        self.path = path
        self.problem = problem


def empty_document() -> dict[str, Any]:
    """The document before anyone has built a Dashboard."""
    return {"dashboards": []}


def validate(document: Any) -> None:
    """Raise `InvalidDocument` unless `document` is structurally sound."""
    root = _obj(document, "", {"dashboards"})
    dashboards = _list(root["dashboards"], "dashboards")
    ids: set[str] = set()
    slugs: set[str] = set()
    for i, dashboard in enumerate(dashboards):
        path = f"dashboards[{i}]"
        _dashboard(dashboard, path)
        _unique(ids, dashboard["id"], f"{path}.id")
        _unique(slugs, dashboard["slug"], f"{path}.slug")


def check_transition(old: dict[str, Any], new: dict[str, Any]) -> None:
    """Raise `InvalidDocument` if publishing `new` over `old` breaks a rule
    that spans the two: a Dashboard's slug is fixed when it is created,
    because its panel's URL is built from it."""
    slugs = {d["id"]: d["slug"] for d in old["dashboards"]}
    for i, dashboard in enumerate(new["dashboards"]):
        was = slugs.get(dashboard["id"])
        if was is not None and was != dashboard["slug"]:
            raise InvalidDocument(
                f"dashboards[{i}].slug", f"is fixed at creation (was {was!r})"
            )


def _dashboard(value: Any, path: str) -> None:
    dashboard = _obj(
        value,
        path,
        {
            "id",
            "slug",
            "name",
            "show_in_sidebar",
            "home_page",
            "settings",
            "navbar",
            "pages",
        },
    )
    _id(dashboard["id"], f"{path}.id")
    slug = _str(dashboard["slug"], f"{path}.slug")
    if len(slug) > MAX_SLUG or not SLUG.match(slug):
        raise InvalidDocument(
            f"{path}.slug",
            f"must be lowercase letters and digits joined by single hyphens, "
            f"at most {MAX_SLUG} characters",
        )
    _str(dashboard["name"], f"{path}.name")
    _bool(dashboard["show_in_sidebar"], f"{path}.show_in_sidebar")
    overflow = _settings(dashboard["settings"], f"{path}.settings")

    pages = _list(dashboard["pages"], f"{path}.pages")
    if not pages:
        raise InvalidDocument(f"{path}.pages", "must hold at least the Home Page")
    page_ids: set[str] = set()
    popups: set[str] = set()
    widget_ids: set[str] = set()
    ordinary: set[str] = set()
    for j, page in enumerate(pages):
        page_path = f"{path}.pages[{j}]"
        _page(page, page_path, overflow)
        _unique(page_ids, page["id"], f"{page_path}.id")
        if page["popup"] is None:
            ordinary.add(page["id"])
        else:
            _unique(popups, page["popup"], f"{page_path}.popup")
        for k, widget in enumerate(page["widgets"]):
            _unique(widget_ids, widget["id"], f"{page_path}.widgets[{k}].id")

    # References are checked once every Page is known: a Widget may open a
    # Page that comes after its own.
    _page_ref(dashboard["home_page"], f"{path}.home_page", ordinary)
    if dashboard["navbar"] is not None:
        _navbar(dashboard["navbar"], f"{path}.navbar", ordinary)
    for j, page in enumerate(pages):
        for k, widget in enumerate(page["widgets"]):
            if widget["on_tap"] is not None:
                _page_ref(
                    widget["on_tap"],
                    f"{path}.pages[{j}].widgets[{k}].on_tap",
                    ordinary,
                )


def _settings(value: Any, path: str) -> str:
    settings = _obj(
        value,
        path,
        {"overflow", "supported_range", "idle_return", "back_history", "theme"},
    )
    overflow = _enum(settings["overflow"], f"{path}.overflow", OVERFLOWS)

    supported = _obj(
        settings["supported_range"], f"{path}.supported_range", {"min", "max"}
    )
    sizes = {
        end: _size(supported[end], f"{path}.supported_range.{end}")
        for end in ("min", "max")
    }
    if any(sizes["min"][k] > sizes["max"][k] for k in ("width", "height")):
        raise InvalidDocument(f"{path}.supported_range", "min must not exceed max")

    if settings["idle_return"] is not None:
        _int(settings["idle_return"], f"{path}.idle_return", minimum=1)
    _bool(settings["back_history"], f"{path}.back_history")

    theme = _obj(settings["theme"], f"{path}.theme", {"name", "mode"})
    _str(theme["name"], f"{path}.theme.name")
    _enum(theme["mode"], f"{path}.theme.mode", MODES)
    return overflow


def _size(value: Any, path: str) -> dict[str, int]:
    size = _obj(value, path, {"width", "height"})
    _int(size["width"], f"{path}.width", minimum=1)
    _int(size["height"], f"{path}.height", minimum=1)
    return size


def _navbar(value: Any, path: str, pages: set[str]) -> None:
    navbar = _obj(value, path, {"edge", "tabs", "items"})
    _enum(navbar["edge"], f"{path}.edge", EDGES)
    _bool(navbar["tabs"], f"{path}.tabs")
    ids: set[str] = set()
    for i, item in enumerate(_list(navbar["items"], f"{path}.items")):
        item_path = f"{path}.items[{i}]"
        item = _obj(item, item_path, {"id", "page", "icon"})
        _id(item["id"], f"{item_path}.id")
        _unique(ids, item["id"], f"{item_path}.id")
        _page_ref(item["page"], f"{item_path}.page", pages)
        _str(item["icon"], f"{item_path}.icon")


def _page(value: Any, path: str, overflow: str) -> None:
    page = _obj(value, path, {"id", "name", "popup", "grid", "widgets"})
    _id(page["id"], f"{path}.id")
    _str(page["name"], f"{path}.name")
    if page["popup"] is not None:
        _str(page["popup"], f"{path}.popup")
        if page["popup"] == NO_POPUP:
            raise InvalidDocument(
                f"{path}.popup", f"{NO_POPUP!r} is the name for no Popup open"
            )
    grid = _obj(page["grid"], f"{path}.grid", {"columns", "rows"})
    columns = _int(grid["columns"], f"{path}.grid.columns", minimum=1, maximum=MAX_GRID)
    rows = _int(grid["rows"], f"{path}.grid.rows", minimum=1, maximum=MAX_GRID)
    for i, widget in enumerate(_list(page["widgets"], f"{path}.widgets")):
        _widget(
            widget, f"{path}.widgets[{i}]", columns, rows if overflow == "fit" else None
        )


def _widget(value: Any, path: str, columns: int, rows: int | None) -> None:
    widget = _obj(
        value,
        path,
        {"id", "kind", "x", "y", "w", "h", "variant", "title", "on_tap", "settings"},
    )
    _id(widget["id"], f"{path}.id")
    _str(widget["kind"], f"{path}.kind")
    x = _int(widget["x"], f"{path}.x", minimum=0)
    y = _int(widget["y"], f"{path}.y", minimum=0)
    w = _int(widget["w"], f"{path}.w", minimum=1)
    h = _int(widget["h"], f"{path}.h", minimum=1)
    if x + w > columns:
        raise InvalidDocument(path, f"overflows the Page's {columns} columns")
    if rows is not None and y + h > rows:
        raise InvalidDocument(
            path,
            f"overflows the Page's {rows} rows, and the Dashboard fits Pages to the screen",
        )
    _enum(widget["variant"], f"{path}.variant", VARIANTS)
    # None is the unset title, which shows the translated Default title; any
    # string, even an empty one, is a title someone wrote.
    if widget["title"] is not None and not isinstance(widget["title"], str):
        raise InvalidDocument(f"{path}.title", "must be a string or null")
    if not isinstance(widget["settings"], dict):
        raise InvalidDocument(f"{path}.settings", "must be an object")


# --- the primitives ---------------------------------------------------------


def _obj(value: Any, path: str, keys: set[str]) -> dict[str, Any]:
    if not isinstance(value, dict):
        raise InvalidDocument(path, "must be an object")
    if missing := keys - value.keys():
        raise InvalidDocument(path, f"is missing {', '.join(sorted(missing))}")
    if extra := value.keys() - keys:
        raise InvalidDocument(path, f"has unknown {', '.join(sorted(map(str, extra)))}")
    return value


def _list(value: Any, path: str) -> list[Any]:
    if not isinstance(value, list):
        raise InvalidDocument(path, "must be a list")
    return value


def _str(value: Any, path: str) -> str:
    if not isinstance(value, str) or not value.strip():
        raise InvalidDocument(path, "must be a non-empty string")
    return value


def _id(value: Any, path: str) -> str:
    _str(value, path)
    if len(value) > MAX_ID:
        raise InvalidDocument(path, f"must be at most {MAX_ID} characters")
    return value


def _bool(value: Any, path: str) -> bool:
    if not isinstance(value, bool):
        raise InvalidDocument(path, "must be true or false")
    return value


def _int(value: Any, path: str, *, minimum: int, maximum: int | None = None) -> int:
    # bool is an int in Python, and never what a size means.
    if not isinstance(value, int) or isinstance(value, bool):
        raise InvalidDocument(path, "must be an integer")
    if value < minimum or (maximum is not None and value > maximum):
        bound = (
            f"between {minimum} and {maximum}"
            if maximum is not None
            else f"at least {minimum}"
        )
        raise InvalidDocument(path, f"must be {bound}")
    return value


def _enum(value: Any, path: str, allowed: tuple[str, ...]) -> str:
    if value not in allowed:
        raise InvalidDocument(path, f"must be one of {', '.join(allowed)}")
    return value


def _unique(seen: set[str], value: str, path: str) -> None:
    if value in seen:
        raise InvalidDocument(path, f"{value!r} is used twice")
    seen.add(value)


def _page_ref(value: Any, path: str, pages: set[str]) -> None:
    if not isinstance(value, str) or value not in pages:
        raise InvalidDocument(
            path, "must name a Page of this Dashboard that is not a Popup's"
        )

"""Where the document lives: one versioned `Store`, and its history (ADR-0015).

The published document sits in `.storage/ohomemy.document` with a revision
counter, written atomically (with fsync) and immediately, never on a delay, so
an acknowledged Publish survives a crash. HA backups include `.storage/`.

Publishing is compare-and-swap on the revision: it names the revision its
Draft started from, and is refused with `Conflict` if anyone Published since.
The losing Builder already holds the newer document from its subscription.

`.storage/ohomemy.history` keeps the last `HISTORY_SIZE` Publishes, newest
first, for undo. Its entries are documents too, so it shares the document's
version and runs the same migrations: an old entry can always be Published
again.
"""

from __future__ import annotations

import asyncio
from collections.abc import Callable
from typing import Any

from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.storage import Store
from homeassistant.util import dt as dt_util

from .const import DOMAIN
from .document import check_transition, empty_document, validate

# The document's version. A minor bump is a change an older integration can
# still read; a major bump is one it cannot, and HA then refuses to load the
# file rather than lose what it does not understand.
VERSION = 1
MINOR_VERSION = 1

HISTORY_SIZE = 20

# Each step brings the document up to the version it is keyed by, in order.
# A step takes and returns the document (`{"dashboards": [...]}`); the
# revision is not the step's business. Empty until the first change of shape.
MIGRATIONS: list[
    tuple[tuple[int, int], Callable[[dict[str, Any]], dict[str, Any]]]
] = []

type Listener = Callable[[int, dict[str, Any]], None]


class Conflict(Exception):
    """Someone Published since the Draft's base revision."""

    def __init__(self, base_revision: int, revision: int) -> None:
        super().__init__(
            f"The document is at revision {revision}, not {base_revision}: "
            "someone Published since this Draft began"
        )
        self.revision = revision


class UnsupportedVersion(Exception):
    """An exported document from a newer OHomeMy than this one."""


def migrate(major: int, minor: int, document: dict[str, Any]) -> dict[str, Any]:
    """Bring a document stored at `major.minor` up to `VERSION.MINOR_VERSION`."""
    if major > VERSION:
        raise UnsupportedVersion(
            f"The document is version {major}.{minor}; this OHomeMy reads "
            f"up to {VERSION}.{MINOR_VERSION}"
        )
    for to, step in MIGRATIONS:
        if (major, minor) < to <= (VERSION, MINOR_VERSION):
            document = step(document)
    return document


class _DocumentStore(Store[dict[str, Any]]):
    async def _async_migrate_func(
        self, old_major_version: int, old_minor_version: int, old_data: dict[str, Any]
    ) -> dict[str, Any]:
        return {
            **old_data,
            "document": migrate(
                old_major_version, old_minor_version, old_data["document"]
            ),
        }


class _HistoryStore(Store[dict[str, Any]]):
    async def _async_migrate_func(
        self, old_major_version: int, old_minor_version: int, old_data: dict[str, Any]
    ) -> dict[str, Any]:
        return {
            "entries": [
                {
                    **entry,
                    "document": migrate(
                        old_major_version, old_minor_version, entry["document"]
                    ),
                }
                for entry in old_data["entries"]
            ]
        }


class Published:
    """The published document, its revision, its history and who listens."""

    def __init__(self, hass: HomeAssistant) -> None:
        self._store = _DocumentStore(
            hass,
            VERSION,
            f"{DOMAIN}.document",
            minor_version=MINOR_VERSION,
            atomic_writes=True,
        )
        self._history_store = _HistoryStore(
            hass,
            VERSION,
            f"{DOMAIN}.history",
            minor_version=MINOR_VERSION,
            atomic_writes=True,
        )
        self.revision = 0
        self.document: dict[str, Any] = empty_document()
        self._history: list[dict[str, Any]] = []
        self._listeners: list[Listener] = []
        # One Publish at a time: the revision check and the write that follows
        # it must not interleave with another's.
        self._lock = asyncio.Lock()

    async def async_load(self) -> None:
        """Read both stores. Nothing stored yet is revision 0, no Dashboards."""
        if (data := await self._store.async_load()) is not None:
            self.revision = data["revision"]
            self.document = data["document"]
        if (history := await self._history_store.async_load()) is not None:
            self._history = history["entries"]

    @callback
    def async_listen(self, listener: Listener) -> Callable[[], None]:
        """Call `listener(revision, document)` after every Publish."""
        self._listeners.append(listener)
        return lambda: self._listeners.remove(listener)

    async def async_publish(
        self, document: Any, base_revision: int, user_id: str | None
    ) -> int:
        """Make `document` the published one, and return its new revision.

        Raises `Conflict` if `base_revision` is stale and `InvalidDocument` if
        the document's structure is wrong; either way nothing is written.
        """
        async with self._lock:
            if base_revision != self.revision:
                raise Conflict(base_revision, self.revision)
            validate(document)
            check_transition(self.document, document)

            revision = self.revision + 1
            await self._store.async_save({"revision": revision, "document": document})
            self.revision = revision
            self.document = document
            for listener in list(self._listeners):
                listener(revision, document)

            self._history = [
                {
                    "revision": revision,
                    "saved_at": dt_util.utcnow().isoformat(),
                    "user_id": user_id,
                    "document": document,
                },
                *self._history,
            ][:HISTORY_SIZE]
            await self._history_store.async_save({"entries": self._history})
            return revision

    @property
    def history(self) -> list[dict[str, Any]]:
        """The last Publishes, newest first, each with its document."""
        return list(self._history)

    def export(self) -> dict[str, Any]:
        """The document as a file someone can keep, labelled with its version."""
        return {
            "version": VERSION,
            "minor_version": MINOR_VERSION,
            "revision": self.revision,
            "document": self.document,
        }

    async def async_import(
        self, exported: Any, base_revision: int, user_id: str | None
    ) -> int:
        """Publish an exported document, migrating it first if it is older.

        It is an ordinary Publish: a new revision, with the conflict check and
        a history entry. The exported revision is only a label.
        """
        if (
            not isinstance(exported, dict)
            or not {"version", "minor_version", "document"} <= exported.keys()
        ):
            raise UnsupportedVersion("Not an OHomeMy export")
        major, minor = exported["version"], exported["minor_version"]
        if not isinstance(major, int) or not isinstance(minor, int):
            raise UnsupportedVersion("Not an OHomeMy export")
        document = migrate(major, minor, exported["document"])
        return await self.async_publish(document, base_revision, user_id)

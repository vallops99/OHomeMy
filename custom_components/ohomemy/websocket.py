"""The document's websocket commands (ADR-0015, docs/research/layout-storage.md §4.1).

| command                       | who          | does                                       |
|-------------------------------|--------------|--------------------------------------------|
| `ohomemy/document/get`        | any user     | `{revision, document}`                     |
| `ohomemy/document/subscribe`  | any user     | an event `{revision, document}` now and    |
|                               |              | after every Publish                        |
| `ohomemy/document/save`       | admin        | `{base_revision, document}` -> `{revision}`|
| `ohomemy/document/history`    | admin        | the last Publishes, newest first           |
| `ohomemy/document/export`     | admin        | `{version, minor_version, revision,        |
|                               |              | document}`                                 |
| `ohomemy/document/import`     | admin        | `{base_revision, data: <an export>}` ->    |
|                               |              | `{revision}`                               |

Every Dashboard's renderer reads the document, so reading is open to any
authenticated user. A panel's `require_admin` only hides it from the sidebar,
so writing is closed here, on each command.

A save or import is refused with `conflict` when its base revision is stale,
`invalid_document` when the structure is wrong (the message names the path),
and `unsupported_version` for an export from a newer OHomeMy.

The commands carry no voluptuous or probatio schema (HA core is between the
two). HA calls a command's schema as a plain function of the message, so each
is registered with one that lets the message through, and its handler reads
the fields itself.
"""

from __future__ import annotations

from collections.abc import Awaitable
from typing import Any

from homeassistant.components import websocket_api
from homeassistant.core import HomeAssistant, callback

from .const import DATA_PUBLISHED
from .document import InvalidDocument
from .store import Conflict, UnsupportedVersion

ERR_CONFLICT = "conflict"
ERR_INVALID_DOCUMENT = "invalid_document"
ERR_UNSUPPORTED_VERSION = "unsupported_version"


@callback
def async_register_commands(hass: HomeAssistant) -> None:
    """Register every command, once for the life of Home Assistant."""
    for command, handler in (
        ("get", ws_get),
        ("subscribe", ws_subscribe),
        ("save", ws_save),
        ("history", ws_history),
        ("export", ws_export),
        ("import", ws_import),
    ):
        websocket_api.async_register_command(
            hass, f"ohomemy/document/{command}", handler, _any_fields
        )


def _any_fields(msg: dict[str, Any]) -> dict[str, Any]:
    return msg


@callback
def ws_get(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]
) -> None:
    published = hass.data[DATA_PUBLISHED]
    connection.send_result(
        msg["id"], {"revision": published.revision, "document": published.document}
    )


@callback
def ws_subscribe(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]
) -> None:
    published = hass.data[DATA_PUBLISHED]
    msg_id = msg["id"]

    @callback
    def send(revision: int, document: dict[str, Any]) -> None:
        connection.send_message(
            websocket_api.event_message(
                msg_id, {"revision": revision, "document": document}
            )
        )

    connection.subscriptions[msg_id] = published.async_listen(send)
    connection.send_result(msg_id)
    # The whole document at once, so a client that reconnects is never stale.
    send(published.revision, published.document)


@websocket_api.require_admin
@websocket_api.async_response
async def ws_save(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]
) -> None:
    if (base := _base_revision(connection, msg)) is None:
        return
    await _publish(
        connection,
        msg["id"],
        hass.data[DATA_PUBLISHED].async_publish(
            msg.get("document"), base, connection.user.id
        ),
    )


@websocket_api.require_admin
@callback
def ws_history(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]
) -> None:
    connection.send_result(msg["id"], {"history": hass.data[DATA_PUBLISHED].history})


@websocket_api.require_admin
@callback
def ws_export(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]
) -> None:
    connection.send_result(msg["id"], hass.data[DATA_PUBLISHED].export())


@websocket_api.require_admin
@websocket_api.async_response
async def ws_import(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]
) -> None:
    if (base := _base_revision(connection, msg)) is None:
        return
    await _publish(
        connection,
        msg["id"],
        hass.data[DATA_PUBLISHED].async_import(
            msg.get("data"), base, connection.user.id
        ),
    )


def _base_revision(
    connection: websocket_api.ActiveConnection, msg: dict[str, Any]
) -> int | None:
    base = msg.get("base_revision")
    if not isinstance(base, int) or isinstance(base, bool):
        connection.send_error(
            msg["id"],
            websocket_api.ERR_INVALID_FORMAT,
            "base_revision must be an integer",
        )
        return None
    return base


async def _publish(
    connection: websocket_api.ActiveConnection, msg_id: int, publish: Awaitable[int]
) -> None:
    try:
        revision = await publish
    except Conflict as err:
        connection.send_error(msg_id, ERR_CONFLICT, str(err))
    except InvalidDocument as err:
        connection.send_error(msg_id, ERR_INVALID_DOCUMENT, str(err))
    except UnsupportedVersion as err:
        connection.send_error(msg_id, ERR_UNSUPPORTED_VERSION, str(err))
    else:
        connection.send_result(msg_id, {"revision": revision})

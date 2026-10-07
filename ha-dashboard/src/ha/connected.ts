/**
 * Whether the websocket to Home Assistant is up, followed as it drops and
 * comes back (#70). A Dashboard following the house keeps what it shows
 * while it is down: the last state it heard is not news.
 *
 * It reads the connection's own `ready` and `disconnected` events rather than
 * @hakit's `connectionStatus`, which tracks only suspending a hidden page.
 * React and @hakit are kept to `useConnected.ts`, so this runs under plain
 * Node in its tests.
 */

/** The part of a `home-assistant-js-websocket` `Connection` this reads. */
export type ConnectionEvents = {
  readonly connected: boolean;
  addEventListener(type: 'ready' | 'disconnected', listener: () => void): void;
  removeEventListener(type: 'ready' | 'disconnected', listener: () => void): void;
};

export type ConnectedSource = { get(): boolean; subscribe(listener: () => void): () => void };

/** No connection yet is not connected. */
export function createConnected(connection: ConnectionEvents | null): ConnectedSource {
  return {
    get: () => connection?.connected ?? false,
    subscribe(listener) {
      if (!connection) return () => {};
      connection.addEventListener('ready', listener);
      connection.addEventListener('disconnected', listener);
      return () => {
        connection.removeEventListener('ready', listener);
        connection.removeEventListener('disconnected', listener);
      };
    },
  };
}

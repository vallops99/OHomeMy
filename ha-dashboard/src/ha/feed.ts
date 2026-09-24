/**
 * The Feed's WebRTC session: the signalling over Home Assistant's websocket
 * (#29, docs/research/camera-streaming.md §5.3).
 *
 * Adapted from Home Assistant frontend's `src/components/ha-web-rtc-player.ts`
 * (https://github.com/home-assistant/frontend, Apache-2.0,
 * Copyright Home Assistant contributors): the same four public websocket
 * commands, in the same order, with the same fix-up for a remote candidate
 * that names no media line. Rewritten rather than ported, and not taken from
 * @hakit's copy of the same file, whose licence forbids it (ADR-0002) and
 * which never unsubscribes on unmount.
 *
 * WebRTC only. A camera whose `frontend_stream_types` lacks `web_rtc` is
 * `unsupported`, a state no retry can fix; there is no HLS or MJPEG fallback,
 * because neither is live enough to count as a Feed (the research, §2.4).
 *
 * **Closing unsubscribes from `camera/webrtc/offer`**, and that is what makes
 * Home Assistant close its end (`close_webrtc_session`). A session left
 * subscribed keeps the camera streaming -- and a battery camera awake -- until
 * the websocket itself closes.
 *
 * No React, no @hakit, no DOM: the websocket and the peer connection are
 * passed in, so `feed.test.ts` drives this under plain Node with fakes.
 * `useFeed` (`./useFeed`) supplies the real ones.
 */

/** The three ways into Home Assistant's websocket this needs. */
export type Signalling = {
  /** A command with one result. */
  request: <T>(msg: Record<string, unknown>) => Promise<T>;
  /** A command whose result is a stream of events; resolves to its unsubscribe. */
  subscribe: (onEvent: (event: Record<string, unknown>) => void, msg: Record<string, unknown>) => Promise<() => Promise<void>>;
  /** A command whose result nobody waits for. */
  send: (msg: Record<string, unknown>) => void;
};

/** An ICE candidate as both the browser and Home Assistant spell it. */
export type IceCandidate = { candidate: string; sdpMid?: string | null; sdpMLineIndex?: number | null };

/** What `camera/webrtc/get_client_config` answers. */
export type ClientConfig = { configuration: unknown; dataChannel?: string; getCandidatesUpfront?: boolean };

/** What the peer tells the session. `S` is the stream: a `MediaStream` in the browser. */
export type PeerHandlers<S> = {
  onCandidate: (candidate: IceCandidate) => void;
  onStream: (stream: S) => void;
  /** The peer connection's `connectionState`. */
  onConnectionState: (state: string) => void;
};

/** The peer connection, narrowed to what the signalling drives. */
export type FeedPeer = {
  /** Receive-only audio and video; resolves to the offer's SDP. */
  offer: () => Promise<string>;
  answer: (sdp: string) => Promise<void>;
  addCandidate: (candidate: IceCandidate) => Promise<void>;
  close: () => void;
};

export type CreatePeer<S> = (config: ClientConfig, handlers: PeerHandlers<S>) => FeedPeer;

export type FeedEvent<S> = { type: 'stream'; stream: S } | { type: 'unsupported' } | { type: 'failed'; message: string };

/**
 * Starts a session for one camera and returns the function that ends it.
 *
 * Reports at most one `unsupported` or `failed`, and nothing at all once
 * closed. A failure releases the session at once, so a Feed waiting to retry
 * holds nothing open in Home Assistant.
 */
export function openFeed<S>(
  signalling: Signalling,
  createPeer: CreatePeer<S>,
  entityId: string,
  emit: (event: FeedEvent<S>) => void
): () => void {
  let over = false; // closed by the caller, or failed
  let peer: FeedPeer | null = null;
  let unsubscribe: Promise<() => Promise<void>> | null = null;
  let sessionId: string | null = null;
  let queued: IceCandidate[] = [];

  const release = () => {
    peer?.close();
    peer = null;
    unsubscribe?.then(unsub => unsub()).catch(() => {});
    unsubscribe = null;
  };

  const fail = (message: string) => {
    if (over) return;
    over = true;
    release();
    emit({ type: 'failed', message });
  };

  const sendCandidate = (session: string, candidate: IceCandidate) =>
    signalling.send({ type: 'camera/webrtc/candidate', entity_id: entityId, session_id: session, candidate });

  const onOfferEvent = (event: Record<string, unknown>) => {
    if (over || peer === null) return;
    switch (event.type) {
      case 'session':
        sessionId = String(event.session_id);
        queued.forEach(c => sendCandidate(sessionId!, c));
        queued = [];
        break;
      case 'answer':
        peer.answer(String(event.answer)).catch(err => fail(messageOf(err)));
        break;
      case 'candidate': {
        // A candidate needs `sdpMid` or `sdpMLineIndex`; some providers send
        // neither, and Home Assistant's own player assumes the first line.
        const c = event.candidate as IceCandidate;
        const fixed = c.sdpMid || c.sdpMLineIndex != null ? c : { candidate: c.candidate, sdpMid: '0' };
        // One bad candidate is not a failed Feed: ICE tries the others.
        peer.addCandidate(fixed).catch(() => {});
        break;
      }
      case 'error':
        fail(String(event.message ?? event.code ?? 'errore'));
        break;
    }
  };

  const start = async () => {
    const capabilities = await signalling.request<{ frontend_stream_types?: string[] }>({
      type: 'camera/capabilities',
      entity_id: entityId,
    });
    if (over) return;
    if (!(capabilities.frontend_stream_types ?? []).includes('web_rtc')) {
      over = true;
      emit({ type: 'unsupported' });
      return;
    }

    const config = await signalling.request<ClientConfig>({ type: 'camera/webrtc/get_client_config', entity_id: entityId });
    if (over) return;

    peer = createPeer(config, {
      onCandidate: candidate => {
        if (over) return;
        if (sessionId === null) queued.push(candidate);
        else sendCandidate(sessionId, candidate);
      },
      onStream: stream => {
        if (!over) emit({ type: 'stream', stream });
      },
      onConnectionState: state => {
        if (state === 'failed') fail('connessione persa');
      },
    });

    const offer = await peer.offer();
    if (over) return;
    unsubscribe = signalling.subscribe(onOfferEvent, { type: 'camera/webrtc/offer', entity_id: entityId, offer });
    unsubscribe.catch(err => fail(messageOf(err)));
  };

  start().catch(err => fail(messageOf(err)));

  return () => {
    over = true;
    release();
  };
}

const messageOf = (err: unknown): string =>
  err instanceof Error ? err.message : typeof err === 'object' && err !== null && 'message' in err ? String(err.message) : String(err);

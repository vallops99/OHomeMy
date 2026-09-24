/// <reference lib="dom" />
// Browser-only, and said so: the tests' program reaches this file through the
// `../ha` barrel without the DOM library, and it names `RTCPeerConnection`.
/**
 * The Feed's session as React state (#29): `openFeed` (`./feed`) wired to
 * the real websocket and the browser's `RTCPeerConnection`, plus the retry.
 *
 * Kept apart from `./feed` so that file stays free of React, @hakit and the
 * DOM, and runs under plain Node in its tests. This is the only other file in
 * `src/ha/` that touches @hakit, and only for the websocket connection.
 */
import { useHass } from '@hakit/core';
import { useCallback, useEffect, useRef, useState } from 'react';
import { openFeed, type CreatePeer, type IceCandidate, type Signalling } from './feed';
import type { EntityId } from './types';

/** How long a failed Feed waits before trying again on its own (#25). */
export const FEED_RETRY_MS = 5_000;

/**
 * How long a session may take to show its first frame before it counts as
 * failed. Without it, a camera that never answers would say `Connessione…`
 * forever and never retry. Generous, because a battery camera wakes up for
 * a live view and a Ring session is negotiated through the cloud (the
 * research, §3 and §4).
 */
const FEED_CONNECT_TIMEOUT_MS = 30_000;

export type FeedSession =
  | { phase: 'connecting'; stream: MediaStream | null }
  | { phase: 'live'; stream: MediaStream }
  | { phase: 'failed'; retryAt: number }
  | { phase: 'unsupported' };

export type Feed = {
  session: FeedSession;
  /** Call when the `<video>` shows its first frame: the Feed is live from then. */
  onFirstFrame: () => void;
  /** Try again now rather than when the countdown runs out. */
  retry: () => void;
};

/** Results are kept under the attempt they belong to, so a new attempt starts clean without a reset. */
type Result = { attempt: number } & (
  { phase: 'stream'; stream: MediaStream; framed: boolean } | { phase: 'failed'; retryAt: number } | { phase: 'unsupported' }
);

/**
 * One camera's live session, or none when `entityId` is null -- an
 * Unavailable camera never plays and never retries.
 *
 * The session opens on mount and closes on unmount, and closing unsubscribes,
 * which is what ends it in Home Assistant. A failure is retried after
 * `FEED_RETRY_MS`, or at once through `retry`; `unsupported` is final.
 */
export function useFeed(entityId: EntityId | null): Feed {
  const connection = useHass(s => s.connection);
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  // The last attempt whose `<video>` showed a frame, for the connect timeout.
  const framedRef = useRef(-1);

  useEffect(() => {
    if (!connection || entityId === null) return;

    const signalling: Signalling = {
      request: msg => connection.sendMessagePromise(msg as { type: string }),
      // No resubscribe: re-sending an old offer to a new websocket would
      // start a session no peer is waiting on. A dropped websocket ends the
      // session in Home Assistant, the peer then fails, and the retry opens
      // a fresh one.
      subscribe: (onEvent, msg) => connection.subscribeMessage(onEvent, msg as { type: string }, { resubscribe: false }),
      send: msg => connection.sendMessage(msg as { type: string }),
    };

    let settled = false; // unsupported or failed: nothing left to time out
    const failed = () => setResult({ attempt, phase: 'failed', retryAt: Date.now() + FEED_RETRY_MS });
    const close = openFeed(signalling, browserPeer, entityId, event => {
      if (event.type === 'stream') {
        setResult({ attempt, phase: 'stream', stream: event.stream, framed: false });
        return;
      }
      settled = true;
      if (event.type === 'unsupported') setResult({ attempt, phase: 'unsupported' });
      else failed();
    });

    const timeout = setTimeout(() => {
      if (settled || framedRef.current === attempt) return;
      close();
      failed();
    }, FEED_CONNECT_TIMEOUT_MS);

    return () => {
      clearTimeout(timeout);
      close();
    };
  }, [connection, entityId, attempt]);

  const current = result?.attempt === attempt ? result : null;

  useEffect(() => {
    if (current?.phase !== 'failed') return;
    const timer = setTimeout(() => setAttempt(a => a + 1), Math.max(0, current.retryAt - Date.now()));
    return () => clearTimeout(timer);
  }, [current]);

  const onFirstFrame = useCallback(() => {
    framedRef.current = attempt;
    setResult(r => (r?.attempt === attempt && r.phase === 'stream' && !r.framed ? { ...r, framed: true } : r));
  }, [attempt]);
  const retry = useCallback(() => setAttempt(a => a + 1), []);

  let session: FeedSession;
  if (current === null) session = { phase: 'connecting', stream: null };
  else if (current.phase === 'stream')
    session = current.framed ? { phase: 'live', stream: current.stream } : { phase: 'connecting', stream: current.stream };
  else session = current;

  return { session, onFirstFrame, retry };
}

/**
 * The browser's peer connection behind `FeedPeer`: receive-only audio and
 * video, as Home Assistant's own player asks for, with every track gathered
 * into one `MediaStream` for the `<video>`.
 */
const browserPeer: CreatePeer<MediaStream> = (config, handlers) => {
  const pc = new RTCPeerConnection(config.configuration as RTCConfiguration);
  // Some cameras (Nest) will not stream without the data channel they name.
  if (config.dataChannel) pc.createDataChannel(config.dataChannel);
  pc.addTransceiver('audio', { direction: 'recvonly' });
  pc.addTransceiver('video', { direction: 'recvonly' });

  const stream = new MediaStream();
  pc.ontrack = e => {
    stream.addTrack(e.track);
    handlers.onStream(stream);
  };
  pc.onicecandidate = e => {
    // Upfront providers take every candidate inside the offer, not after it.
    if (e.candidate?.candidate && !config.getCandidatesUpfront) handlers.onCandidate(e.candidate.toJSON() as IceCandidate);
  };
  pc.onconnectionstatechange = () => handlers.onConnectionState(pc.connectionState);

  return {
    offer: async () => {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      if (!config.getCandidatesUpfront) return offer.sdp ?? '';
      await new Promise<void>(resolve => {
        if (pc.iceGatheringState === 'complete') return resolve();
        pc.onicegatheringstatechange = () => {
          if (pc.iceGatheringState === 'complete') resolve();
        };
      });
      return pc.localDescription?.sdp ?? offer.sdp ?? '';
    },
    answer: sdp => pc.setRemoteDescription({ type: 'answer', sdp }),
    addCandidate: candidate => pc.addIceCandidate(candidate),
    close: () => {
      pc.ontrack = null;
      pc.onicecandidate = null;
      pc.onconnectionstatechange = null;
      pc.onicegatheringstatechange = null;
      stream.getTracks().forEach(track => track.stop());
      pc.close();
    },
  };
};

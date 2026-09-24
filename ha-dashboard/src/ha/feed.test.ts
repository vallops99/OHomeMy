/**
 * The Feed's WebRTC session (#29), against a fake Home Assistant websocket
 * and a fake peer: what is asked of Home Assistant, in what order, and that
 * closing always releases the Home Assistant session.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { openFeed, type FeedEvent, type FeedPeer, type PeerHandlers, type Signalling } from './feed';

type Msg = Record<string, unknown>;

/** Lets every pending promise callback run. */
const settle = () => new Promise(resolve => setTimeout(resolve, 0));

function fakeHouse(streamTypes: string[] = ['web_rtc'], clientConfig: Msg = { configuration: { iceServers: [] } }) {
  const requests: Msg[] = [];
  const sent: Msg[] = [];
  const subscriptions: { msg: Msg; push: (e: Msg) => void; unsubscribed: boolean }[] = [];
  let failRequest: string | null = null;
  const signalling: Signalling = {
    request: async <T>(msg: Msg) => {
      requests.push(msg);
      if (failRequest && msg.type === failRequest) throw new Error(`${failRequest} refused`);
      if (msg.type === 'camera/capabilities') return { frontend_stream_types: streamTypes } as T;
      if (msg.type === 'camera/webrtc/get_client_config') return clientConfig as T;
      throw new Error(`unexpected ${String(msg.type)}`);
    },
    subscribe: async (onEvent, msg) => {
      const sub = { msg, push: onEvent, unsubscribed: false };
      subscriptions.push(sub);
      return async () => {
        sub.unsubscribed = true;
      };
    },
    send: msg => {
      sent.push(msg);
    },
  };
  return {
    signalling,
    requests,
    sent,
    subscriptions,
    refuse(type: string) {
      failRequest = type;
    },
  };
}

function fakePeer() {
  const peer = {
    handlers: null as PeerHandlers<string> | null,
    config: null as unknown,
    answers: [] as string[],
    candidates: [] as unknown[],
    closed: false,
    answerFails: false,
  };
  const create = (config: unknown, handlers: PeerHandlers<string>): FeedPeer => {
    peer.config = config;
    peer.handlers = handlers;
    return {
      offer: async () => 'v=0 offer',
      answer: async sdp => {
        if (peer.answerFails) throw new Error('bad answer');
        peer.answers.push(sdp);
      },
      addCandidate: async c => {
        peer.candidates.push(c);
      },
      close: () => {
        peer.closed = true;
      },
    };
  };
  return { peer, create };
}

function open(house = fakeHouse(), rtc = fakePeer()) {
  const events: FeedEvent<string>[] = [];
  const close = openFeed(house.signalling, rtc.create, 'camera.cancello', e => events.push(e));
  return { house, rtc, events, close };
}

test('a camera that offers WebRTC is asked for its config, then sent an offer', async () => {
  const { house, rtc } = open(fakeHouse(['hls', 'web_rtc'], { configuration: { iceServers: ['stun'] } }));
  await settle();

  assert.deepEqual(
    house.requests.map(r => r.type),
    ['camera/capabilities', 'camera/webrtc/get_client_config']
  );
  assert.deepEqual(rtc.peer.config, { configuration: { iceServers: ['stun'] } });
  assert.deepEqual(house.subscriptions[0].msg, { type: 'camera/webrtc/offer', entity_id: 'camera.cancello', offer: 'v=0 offer' });
});

test('a camera without WebRTC is unsupported, and no session is started', async () => {
  const { house, events, rtc } = open(fakeHouse(['hls']));
  await settle();

  assert.deepEqual(events, [{ type: 'unsupported' }]);
  assert.equal(rtc.peer.handlers, null);
  assert.equal(house.subscriptions.length, 0);
});

test('the answer reaches the peer, and the stream is reported when it arrives', async () => {
  const { house, rtc, events } = open();
  await settle();

  house.subscriptions[0].push({ type: 'session', session_id: 's1' });
  house.subscriptions[0].push({ type: 'answer', answer: 'v=0 answer' });
  rtc.peer.handlers!.onStream('the-stream');
  await settle();

  assert.deepEqual(rtc.peer.answers, ['v=0 answer']);
  assert.deepEqual(events, [{ type: 'stream', stream: 'the-stream' }]);
});

test('local candidates wait for the session id, then go out in order', async () => {
  const { house, rtc } = open();
  await settle();

  rtc.peer.handlers!.onCandidate({ candidate: 'c1', sdpMid: '0' });
  rtc.peer.handlers!.onCandidate({ candidate: 'c2', sdpMid: '0' });
  assert.equal(house.sent.length, 0);

  house.subscriptions[0].push({ type: 'session', session_id: 's1' });
  rtc.peer.handlers!.onCandidate({ candidate: 'c3', sdpMid: '0' });

  assert.deepEqual(
    house.sent.map(m => [m.type, m.entity_id, m.session_id, (m.candidate as Msg).candidate]),
    [
      ['camera/webrtc/candidate', 'camera.cancello', 's1', 'c1'],
      ['camera/webrtc/candidate', 'camera.cancello', 's1', 'c2'],
      ['camera/webrtc/candidate', 'camera.cancello', 's1', 'c3'],
    ]
  );
});

test('a remote candidate with no line reference is given sdpMid 0, as Home Assistant’s player does', async () => {
  const { house, rtc } = open();
  await settle();

  house.subscriptions[0].push({ type: 'candidate', candidate: { candidate: 'r1' } });
  house.subscriptions[0].push({ type: 'candidate', candidate: { candidate: 'r2', sdpMLineIndex: 1 } });
  await settle();

  assert.deepEqual(rtc.peer.candidates, [
    { candidate: 'r1', sdpMid: '0' },
    { candidate: 'r2', sdpMLineIndex: 1 },
  ]);
});

test('closing unsubscribes, which is what closes the session in Home Assistant, and closes the peer', async () => {
  const { house, rtc, close } = open();
  await settle();

  close();
  await settle();

  assert.equal(house.subscriptions[0].unsubscribed, true);
  assert.equal(rtc.peer.closed, true);
});

test('closing before the offer went out sends no offer at all', async () => {
  const { house, close, events } = open();
  close();
  await settle();

  assert.equal(house.subscriptions.length, 0);
  assert.deepEqual(events, []);
});

test('an error from Home Assistant fails the Feed and releases the session', async () => {
  const { house, rtc, events } = open();
  await settle();

  house.subscriptions[0].push({ type: 'error', code: 'webrtc_offer_failed', message: 'camera offline' });
  await settle();

  assert.deepEqual(events, [{ type: 'failed', message: 'camera offline' }]);
  assert.equal(house.subscriptions[0].unsubscribed, true);
  assert.equal(rtc.peer.closed, true);
});

test('a refused request fails the Feed', async () => {
  const house = fakeHouse();
  house.refuse('camera/webrtc/get_client_config');
  const { events } = open(house);
  await settle();

  assert.deepEqual(events, [{ type: 'failed', message: 'camera/webrtc/get_client_config refused' }]);
});

test('an answer the peer rejects fails the Feed', async () => {
  const rtc = fakePeer();
  rtc.peer.answerFails = true;
  const { house, events } = open(fakeHouse(), rtc);
  await settle();

  house.subscriptions[0].push({ type: 'answer', answer: 'garbage' });
  await settle();

  assert.deepEqual(events, [{ type: 'failed', message: 'bad answer' }]);
});

test('a dropped connection fails the Feed, once', async () => {
  const { rtc, events } = open();
  await settle();

  rtc.peer.handlers!.onConnectionState('failed');
  rtc.peer.handlers!.onConnectionState('failed');

  assert.deepEqual(events, [{ type: 'failed', message: 'connessione persa' }]);
});

test('nothing is reported after closing', async () => {
  const { house, rtc, events, close } = open();
  await settle();

  close();
  rtc.peer.handlers!.onStream('late');
  rtc.peer.handlers!.onConnectionState('failed');
  house.subscriptions[0].push({ type: 'error', code: 'x', message: 'late' });
  await settle();

  assert.deepEqual(events, []);
});

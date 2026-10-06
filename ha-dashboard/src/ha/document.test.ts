/**
 * The document's client (#48), against a fake Home Assistant websocket: what
 * each call sends, and how a Publish's refusals come back.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { OHomeMyDocument, Published } from '../document/types';
import { getDocument, saveDocument, subscribeDocument, type DocumentChannel } from './document';

type Msg = Record<string, unknown>;

const empty: OHomeMyDocument = { dashboards: [] };

function fakeHouse(answer: (msg: Msg) => unknown) {
  const requests: Msg[] = [];
  const subscriptions: { msg: Msg; push: (e: Msg) => void; unsubscribed: boolean }[] = [];
  const channel: DocumentChannel = {
    request: async <T>(msg: Msg) => {
      requests.push(msg);
      return answer(msg) as T;
    },
    subscribe: async (onEvent, msg) => {
      const sub = { msg, push: onEvent, unsubscribed: false };
      subscriptions.push(sub);
      return async () => {
        sub.unsubscribed = true;
      };
    },
  };
  return { channel, requests, subscriptions };
}

/** Home Assistant refusing a command, as home-assistant-js-websocket rejects it. */
const refusal = (code: string, message: string) => {
  throw { code, message };
};

test('get asks for the document and answers it with its revision', async () => {
  const house = fakeHouse(() => ({ revision: 3, document: empty }));
  assert.deepEqual(await getDocument(house.channel), { revision: 3, document: empty });
  assert.deepEqual(house.requests, [{ type: 'ohomemy/document/get' }]);
});

test('subscribe hands on every Publish, and unsubscribes', async () => {
  const house = fakeHouse(() => undefined);
  const heard: Published[] = [];
  const unsubscribe = await subscribeDocument(house.channel, p => heard.push(p));

  const [sub] = house.subscriptions;
  assert.deepEqual(sub.msg, { type: 'ohomemy/document/subscribe' });
  sub.push({ revision: 0, document: empty });
  sub.push({ revision: 1, document: empty });
  assert.deepEqual(
    heard.map(p => p.revision),
    [0, 1]
  );

  await unsubscribe();
  assert.equal(sub.unsubscribed, true);
});

test('save sends the whole document over its base revision', async () => {
  const house = fakeHouse(() => ({ revision: 5 }));
  assert.deepEqual(await saveDocument(house.channel, empty, 4), { outcome: 'published', revision: 5 });
  assert.deepEqual(house.requests, [{ type: 'ohomemy/document/save', base_revision: 4, document: empty }]);
});

test('a stale base revision comes back as a conflict', async () => {
  const house = fakeHouse(() => refusal('conflict', 'The document is at revision 5, not 4'));
  assert.deepEqual(await saveDocument(house.channel, empty, 4), {
    outcome: 'conflict',
    message: 'The document is at revision 5, not 4',
  });
});

test('a structural error comes back as invalid, naming where', async () => {
  const house = fakeHouse(() => refusal('invalid_document', 'dashboards[0].home_page: must name a Page'));
  const outcome = await saveDocument(house.channel, empty, 0);
  assert.equal(outcome.outcome, 'invalid');
  assert.match(outcome.outcome === 'invalid' ? outcome.message : '', /^dashboards\[0\]\.home_page:/);
});

test('anything else, like a non-admin refused, rejects', async () => {
  const house = fakeHouse(() => refusal('unauthorized', 'Unauthorized'));
  await assert.rejects(saveDocument(house.channel, empty, 0), { code: 'unauthorized' });
});

/** The Default Dashboards' client (#57), against a fake Home Assistant websocket. */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { setSystemDefault, setUserDefault, subscribeDefaults, type Defaults } from './defaults';
import type { DocumentChannel } from './document';

type Msg = Record<string, unknown>;

function fakeHouse() {
  const requests: Msg[] = [];
  const subscriptions: { msg: Msg; push: (e: Msg) => void }[] = [];
  const channel: DocumentChannel = {
    request: async <T>(msg: Msg) => {
      requests.push(msg);
      return undefined as T;
    },
    subscribe: async (onEvent, msg) => {
      subscriptions.push({ msg, push: onEvent });
      return async () => {};
    },
  };
  return { channel, requests, subscriptions };
}

test('subscribe hands on every change of the defaults', async () => {
  const house = fakeHouse();
  const heard: Defaults[] = [];
  await subscribeDefaults(house.channel, d => heard.push(d));

  const [sub] = house.subscriptions;
  assert.deepEqual(sub.msg, { type: 'ohomemy/defaults/subscribe' });
  const defaults = {
    system: 'ohomemy-wall',
    users: [{ id: 'u1', name: 'Tablet', is_admin: false, is_active: true, default_panel: null }],
  };
  sub.push(defaults);
  assert.deepEqual(heard, [defaults]);
});

test("setting a user's default names the user and the Dashboard, or null to clear", async () => {
  const house = fakeHouse();
  await setUserDefault(house.channel, 'u1', 'wall');
  await setUserDefault(house.channel, 'u1', null);
  assert.deepEqual(house.requests, [
    { type: 'ohomemy/defaults/set_user', user_id: 'u1', dashboard_id: 'wall' },
    { type: 'ohomemy/defaults/set_user', user_id: 'u1', dashboard_id: null },
  ]);
});

test('setting the system default names the Dashboard, or null to clear', async () => {
  const house = fakeHouse();
  await setSystemDefault(house.channel, 'wall');
  await setSystemDefault(house.channel, null);
  assert.deepEqual(house.requests, [
    { type: 'ohomemy/defaults/set_system', dashboard_id: 'wall' },
    { type: 'ohomemy/defaults/set_system', dashboard_id: null },
  ]);
});

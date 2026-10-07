import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Dashboard, OHomeMyDocument } from '../document/types';
import type { Defaults, UserDefault } from '../ha';
import { choices, lostDefaults, panelPath, targetOf } from './defaults';
import { newDashboard } from './draft';

const dash = (id: string, name = id): Dashboard => ({ ...newDashboard({ name, slug: id }, 'Home', () => `${id}-x`), id });
const doc = (...dashboards: Dashboard[]): OHomeMyDocument => ({ dashboards });
const user = (id: string, default_panel: string | null): UserDefault => ({ id, name: id, is_admin: false, is_active: true, default_panel });

test("a Dashboard's panel path is built from its slug", () => {
  assert.equal(panelPath('wall'), 'ohomemy-wall');
});

test('a default lands on nothing set, a Published Dashboard, or another panel', () => {
  const published = doc(dash('wall'));
  assert.deepEqual(targetOf(null, published), { kind: 'none' });
  assert.deepEqual(targetOf('ohomemy-wall', published), { kind: 'dashboard', dashboard: published.dashboards[0] });
  assert.deepEqual(targetOf('lovelace', published), { kind: 'other', urlPath: 'lovelace' });
  // A Dashboard deleted since is just a panel that is not there.
  assert.deepEqual(targetOf('ohomemy-gone', published), { kind: 'other', urlPath: 'ohomemy-gone' });
});

test('only a Published Dashboard can be chosen; one only in the Draft is listed, not yet choosable', () => {
  const published = doc(dash('wall', 'Wall'), dash('phone'));
  const draft = doc(dash('kitchen'), dash('wall', 'Wall renamed'));
  assert.deepEqual(
    choices(published, draft).map(c => [c.dashboard.id, c.dashboard.name, c.published]),
    [
      ['kitchen', 'kitchen', false],
      // A rename is not Published yet either: the panel still has its old title.
      ['wall', 'Wall', true],
      // Deleted in the Draft, but Published until the Draft is.
      ['phone', 'phone', true],
    ]
  );
});

test('a Draft deleting a Dashboard someone has as their default says whose', () => {
  const base = doc(dash('wall'), dash('phone'), dash('spare'));
  const draft = doc(dash('phone'));
  const defaults: Defaults = {
    system: 'ohomemy-spare',
    users: [user('tablet', 'ohomemy-wall'), user('me', 'ohomemy-phone'), user('guest', null), user('kid', 'ohomemy-wall')],
  };
  assert.deepEqual(
    lostDefaults(base, draft, defaults).map(l => [l.dashboard.id, l.users.map(u => u.id), l.system]),
    [
      ['wall', ['tablet', 'kid'], false],
      ['spare', [], true],
    ]
  );
  assert.deepEqual(lostDefaults(base, base, defaults), []);
});

test('whose default is cleared falls back to the system default only if that one survives the Publish', () => {
  const base = doc(dash('wall'), dash('phone'), dash('spare'));
  const tablet = user('tablet', 'ohomemy-wall');
  const fallbacks = (draft: OHomeMyDocument, system: string | null) =>
    lostDefaults(base, draft, { system, users: [tablet] }).map(l => [l.dashboard.id, l.fallback]);

  assert.deepEqual(fallbacks(doc(dash('phone')), 'ohomemy-phone'), [['wall', 'system']]);
  assert.deepEqual(fallbacks(doc(dash('phone')), 'lovelace'), [['wall', 'system']]);
  assert.deepEqual(fallbacks(doc(dash('phone')), null), [['wall', 'home-assistant']]);
  // The same Publish clears the system default too, so nobody lands on it.
  assert.deepEqual(fallbacks(doc(dash('phone')), 'ohomemy-spare'), [
    ['wall', 'home-assistant'],
    ['spare', 'home-assistant'],
  ]);
  assert.deepEqual(fallbacks(doc(dash('phone'), dash('spare')), 'ohomemy-wall'), [['wall', 'home-assistant']]);
});

/**
 * The house's entities as a Dashboard of the document sees them (#64,
 * ADR-0015): a Widget names its entities, and no Label decides whether they
 * are shown -- `ignored` included.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { validateWidget } from '../document/schema';
import { dashboardShows } from '../document/shows';
import type { Dashboard, Widget } from '../document/types';
import { toggleSchema } from '../widgets/toggle/schema';
import { houseEntities, houseOf, type RegistryEntry } from './entities';
import { dashboardConcerns } from './verdict';

// Home Assistant still sends an entry's `labels`; nothing reads them.
const registry: (RegistryEntry & { labels?: string[] })[] = [
  { entity_id: 'light.salone', area_id: 'salone' },
  { entity_id: 'light.cantina', area_id: 'cantina', labels: ['ignored'] },
  { entity_id: 'update.router' },
  { entity_id: 'button.restart', entity_category: 'config' },
];
const states = {
  'light.salone': { state: 'on', attributes: { friendly_name: 'Salone' } },
  'light.cantina': { state: 'unavailable', attributes: { friendly_name: 'Cantina' } },
  'update.router': { state: 'off', attributes: {} },
  'button.restart': { state: 'unknown', attributes: {} },
};

const toggle: Widget = {
  id: 'w',
  kind: 'toggle',
  x: 0,
  y: 0,
  w: 1,
  h: 1,
  variant: 'full',
  title: null,
  on_tap: null,
  settings: { entity: 'light.cantina' },
};

const dashboard: Dashboard = {
  id: 'd',
  slug: 'd',
  name: 'D',
  show_in_sidebar: true,
  home_page: 'home',
  settings: {
    overflow: 'fit',
    supported_range: { min: { width: 1, height: 1 }, max: { width: 2, height: 2 } },
    idle_return: null,
    back_history: true,
    theme: { name: 'casa-panel', mode: 'follow-device' },
  },
  navbar: null,
  pages: [{ id: 'home', name: 'home', popup: null, grid: { columns: 4, rows: 4 }, widgets: [toggle] }],
};

test('an entity carrying `ignored` is still in the house', () => {
  const entities = houseEntities(registry, states, {});
  assert.deepEqual([...entities.keys()].sort(), ['light.cantina', 'light.salone']);
});

test('denylisted Domains and `config` or `diagnostic` entities are still left out', () => {
  const entities = houseEntities(registry, states, {});
  assert.equal(entities.has('update.router'), false);
  assert.equal(entities.has('button.restart'), false);
});

test('an entity carrying `ignored` renders when a Widget names it, and counts as shown', () => {
  const entities = houseEntities(registry, states, {});
  const house = houseOf(entities, ['salone', 'cantina']);
  const grid = { ...dashboard.pages[0].grid, overflow: dashboard.settings.overflow };

  assert.deepEqual(validateWidget(toggle, toggleSchema, { grid, house }), { ok: true, settings: { entity: 'light.cantina' } });

  const shows = dashboardShows(dashboard, kind => (kind === 'toggle' ? toggleSchema : undefined), house);
  assert.deepEqual(
    dashboardConcerns(entities.values(), shows).map(c => [c.level, c.entities.map(e => e.id)]),
    [['fault', ['light.cantina']]]
  );
});

test('no live state reads as Unavailable, and an Area comes from the device', () => {
  const entities = houseEntities([{ entity_id: 'sensor.t', device_id: 'dev' }], {}, { dev: { area_id: 'cucina' } });
  const t = entities.get('sensor.t');
  assert.equal(t?.state, 'unavailable');
  assert.equal(t?.unavailable, true);
  assert.equal(t?.areaId, 'cucina');
  assert.equal(t?.name, 'sensor.t');
});

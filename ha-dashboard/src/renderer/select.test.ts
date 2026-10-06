/**
 * Which Dashboard and Page the renderer shows (#50).
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Dashboard, OHomeMyDocument, Page } from '../document/types';
import { dashboardRef, selectHomePage } from './select';

const page = (id: string, popup: string | null = null): Page => ({ id, name: id, popup, grid: { columns: 12, rows: 8 }, widgets: [] });

const dashboard = (id: string, slug: string, pages: Page[] = [page('home')]): Dashboard => ({
  id,
  slug,
  name: id,
  show_in_sidebar: true,
  home_page: 'home',
  settings: {
    overflow: 'fit',
    supported_range: { min: { width: 1024, height: 600 }, max: { width: 1280, height: 800 } },
    idle_return: null,
    back_history: false,
    theme: { name: 'casa-panel', mode: 'dark' },
  },
  navbar: null,
  pages,
});

const doc: OHomeMyDocument = {
  dashboards: [dashboard('d1', 'wall', [page('ring', 'ring'), page('other'), page('home')]), dashboard('d2', 'phone')],
};

test('the panel names its Dashboard by id', () => {
  assert.deepEqual(dashboardRef({ dashboard_id: 'd1' }, '?dashboard=phone'), { by: 'id', id: 'd1' });
});

test('without a panel, ?dashboard= names it by slug', () => {
  assert.deepEqual(dashboardRef(null, '?dashboard=phone'), { by: 'slug', slug: 'phone' });
  assert.deepEqual(dashboardRef({}, '?x=1&dashboard=wall'), { by: 'slug', slug: 'wall' });
  assert.equal(dashboardRef(null, ''), null);
  assert.equal(dashboardRef({ dashboard_id: '' }, '?dashboard='), null);
});

test('a Dashboard found by id or slug opens on its Home Page', () => {
  const byId = selectHomePage(doc, { by: 'id', id: 'd1' });
  assert.equal(byId.state, 'page');
  if (byId.state === 'page') assert.equal(byId.page.id, 'home');
  const bySlug = selectHomePage(doc, { by: 'slug', slug: 'phone' });
  assert.equal(bySlug.state === 'page' && bySlug.dashboard.id, 'd2');
});

test('an unknown Dashboard is missing, and an empty document has none', () => {
  assert.deepEqual(selectHomePage(doc, { by: 'id', id: 'placeholder' }), { state: 'missing' });
  assert.deepEqual(selectHomePage(doc, null), { state: 'missing' });
  assert.deepEqual(selectHomePage({ dashboards: [] }, { by: 'id', id: 'd1' }), { state: 'none' });
});

test('a Home Page that is not there falls back to the first ordinary Page, never a Popup', () => {
  const broken = { dashboards: [{ ...dashboard('d1', 'wall', [page('ring', 'ring'), page('other')]) }] };
  const s = selectHomePage(broken, { by: 'id', id: 'd1' });
  assert.equal(s.state === 'page' && s.page.id, 'other');
});

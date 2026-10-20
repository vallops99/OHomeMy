/**
 * Which Popup is open, and which Page of a Dashboard lays it out (#58).
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Dashboard, Page, Widget } from '../document/types';
import { activityGate, openPopup, opensPage, popupPage } from './popup';

const widget = (id: string, on_tap: string | null = null): Widget => ({
  id,
  kind: 'clock',
  x: 0,
  y: 0,
  w: 1,
  h: 1,
  variant: 'full',
  title: null,
  on_tap,
  settings: {},
});

const page = (id: string, popup: string | null = null, widgets: Widget[] = []): Page => ({
  id,
  name: id,
  popup,
  grid: { columns: 12, rows: 8 },
  widgets,
});

const dashboard = (pages: Page[]): Dashboard => ({
  id: 'wall',
  slug: 'wall',
  name: 'Wall',
  show_in_sidebar: true,
  home_page: 'home',
  settings: {
    overflow: 'fit',
    supported_range: { min: { width: 1024, height: 600 }, max: { width: 1280, height: 800 } },
    idle_return: null,
    back_history: false,
    theme: { name: 'casa-panel', mode: 'follow-device' },
  },
  navbar: null,
  pages,
});

const select = (state: string, unavailable = false) => ({ state, unavailable });

test('a selected name is the open Popup', () => {
  assert.equal(openPopup(select('doorbell')), 'doorbell');
});

test('none, empty, unknown, unavailable and a missing select all mean closed', () => {
  assert.equal(openPopup(select('none')), null);
  assert.equal(openPopup(select('')), null);
  assert.equal(openPopup(select('unknown', true)), null);
  assert.equal(openPopup(select('unavailable', true)), null);
  assert.equal(openPopup(null), null);
});

test("the Popup's Page is the one laying out that name", () => {
  const doorbell = page('p-doorbell', 'doorbell');
  const d = dashboard([page('home'), page('p-gate', 'gate'), doorbell]);
  assert.equal(popupPage(d, 'doorbell'), doorbell);
});

test('a Dashboard defining no Page for the name shows nothing', () => {
  const d = dashboard([page('home'), page('p-gate', 'gate')]);
  assert.equal(popupPage(d, 'doorbell'), null);
  assert.equal(popupPage(d, null), null);
});

test('an ordinary Page whose id matches the name is not a Popup', () => {
  const d = dashboard([page('home'), page('doorbell')]);
  assert.equal(popupPage(d, 'doorbell'), null);
});

test('only a Widget with an on tap opens a Page', () => {
  const p = page('p-doorbell', 'doorbell', [widget('cam'), widget('to-gate', 'gate')]);
  assert.equal(opensPage(p, 'to-gate'), true);
  assert.equal(opensPage(p, 'cam'), false);
  assert.equal(opensPage(p, 'elsewhere'), false);
  assert.equal(opensPage(p, null), false);
});

test("a Member's tap on a Popup's Page opens a Page too", () => {
  const group: Widget = {
    ...widget('group'),
    kind: 'group',
    settings: { members: [{ entity: 'lock.gate', name: null, variant: null, on_tap: 'gates' }, 'lock.door'] },
  };
  const p = page('p-doorbell', 'doorbell', [group]);
  assert.equal(opensPage(p, 'group', 'lock.gate'), true);
  assert.equal(opensPage(p, 'group', 'lock.door'), false);
  assert.equal(opensPage(p, 'group', 'lock.elsewhere'), false);
  assert.equal(opensPage(p, 'group', null), false, "the Group's own tap is unset");
});

test('the activity gate reports a touch, then none until the interval has passed', () => {
  const gate = activityGate(5_000);
  assert.equal(gate(1_000), true);
  assert.equal(gate(2_000), false);
  assert.equal(gate(5_999), false);
  assert.equal(gate(6_000), true);
});

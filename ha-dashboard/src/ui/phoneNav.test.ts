/**
 * The phone's navigation (#15): one stack per tab.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { PageLayout, Placed } from '../ha';
import { back, currentPage, initialNav, openPage, selectTab, visibleTabs } from './phoneNav';

test('a Page opens inside the current tab, over its root', () => {
  const nav = openPage(selectTab(initialNav, 'stanze'), 'soggiorno');
  assert.equal(currentPage(nav), 'soggiorno');
  assert.deepEqual(nav.stacks, { casa: [], stanze: ['soggiorno'], altro: [] });
});

test('switching tabs keeps each tab where it was', () => {
  let nav = openPage(selectTab(initialNav, 'stanze'), 'soggiorno');
  nav = selectTab(nav, 'casa');
  assert.equal(currentPage(nav), 'main');
  nav = selectTab(nav, 'stanze');
  assert.equal(currentPage(nav), 'soggiorno');
});

test('tapping the current tab takes it to its root', () => {
  let nav = openPage(openPage(selectTab(initialNav, 'altro'), 'corridoio'), 'cucina');
  nav = selectTab(nav, 'altro');
  assert.equal(currentPage(nav), 'main');
  assert.deepEqual(nav.stacks.altro, []);
});

test('back pops one level, and does nothing at the root', () => {
  let nav = openPage(openPage(initialNav, 'corridoio'), 'cucina');
  nav = back(nav);
  assert.equal(currentPage(nav), 'corridoio');
  nav = back(back(nav));
  assert.equal(nav, back(nav));
  assert.equal(currentPage(nav), 'main');
});

test('opening main goes home instead of stacking the tabs again', () => {
  const nav = openPage(openPage(initialNav, 'corridoio'), 'main');
  assert.deepEqual(nav.stacks.casa, []);
  assert.equal(openPage(initialNav, 'main'), initialNav);
});

test('opening the Page already on screen changes nothing', () => {
  const nav = openPage(initialNav, 'corridoio');
  assert.equal(openPage(nav, 'corridoio'), nav);
});

const one: Placed[] = [{ kind: 'area', area: { id: 'x', name: 'x', labels: [], icon: null, entities: [] } }];
const layout = (parts: Partial<PageLayout>): PageLayout => ({ glance: [], left: [], right: [], footer: [], ...parts });

test('a tab with nothing Placed in its Regions is not shown', () => {
  assert.deepEqual(visibleTabs(layout({ glance: one, right: one }), true), ['casa', 'stanze']);
  assert.deepEqual(visibleTabs(layout({ footer: one }), true), ['altro']);
  assert.deepEqual(visibleTabs(layout({}), true), []);
});

test('glance only fills Casa while the glance toggle is on', () => {
  assert.deepEqual(visibleTabs(layout({ glance: one }), false), []);
  assert.deepEqual(visibleTabs(layout({ glance: one, left: one }), false), ['casa']);
});

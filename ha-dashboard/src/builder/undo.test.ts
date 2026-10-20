/**
 * Undo and Redo of Draft edits (#74), as session transitions: one stack per
 * Dashboard and one for the list, merged by what an edit touched, and all
 * cleared when the Draft is Published or replaced.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Dashboard, OHomeMyDocument, Published, Widget } from '../document/types';
import { addDashboard, deleteDashboard, duplicateDashboard, newDashboard, renameDashboard } from './draft';
import { addWidget, placeWidget, updateWidget } from './layout';
import { mapDashboard, renamePage } from './pages';
import { inConflict, isDirty, sessionReducer, type Session, type SessionEvent } from './session';
import { stackOf, undoAsks, type EditTarget } from './undo';

const ids = (prefix: string) => {
  let n = 0;
  return () => `${prefix}-${++n}`;
};
const dashboard = (id: string): Dashboard => ({ ...newDashboard({ name: id, slug: id }, 'Home', ids(id)), id });
const clock = (id: string, x = 0): Widget => ({
  id,
  kind: 'clock',
  x,
  y: 0,
  w: 2,
  h: 1,
  variant: 'full',
  title: null,
  on_tap: null,
  settings: {},
});

const at = (revision: number, document: OHomeMyDocument): Published => ({ revision, document });
const base: OHomeMyDocument = { dashboards: [dashboard('wall'), dashboard('phone')] };
const home = (s: Session, id = 'wall') => s.draft.dashboards.find(d => d.id === id)!.pages[0];

function run(...events: SessionEvent[]): Session {
  const s = events.reduce<Session | null>(sessionReducer, null);
  assert.ok(s);
  return s;
}
const received = (published: Published): SessionEvent => ({ type: 'received', published });
const start = received(at(1, base));

/** An edit inside the Dashboard `id`, as its screen sends it. */
const inside = (id: string, f: (d: Dashboard) => Dashboard, key?: string | null): SessionEvent => ({
  type: 'edited',
  edit: d => mapDashboard(d, id, f),
  on: { stack: 'dashboard', id, ...(key !== undefined && { key }) } as EditTarget,
});
const onList = (edit: (d: OHomeMyDocument) => OHomeMyDocument): SessionEvent => ({ type: 'edited', edit, on: { stack: 'list' } });
const undo = (scope: string | null): SessionEvent => ({ type: 'undone', scope });
const redo = (scope: string | null): SessionEvent => ({ type: 'redone', scope });
const sealed: SessionEvent = { type: 'sealed' };

const addClock = (id: string, w: Widget) => inside(id, d => addWidget(d, d.pages[0].id, w));
const title = (id: string, widget: string, text: string) => inside(id, d => updateWidget(d, d.pages[0].id, widget, { title: text }));

test("Undo and Redo on a Dashboard take back and put back that Dashboard's edits only", () => {
  const s = run(start, addClock('wall', clock('a')), addClock('phone', clock('b')), undo('wall'));
  assert.deepEqual(home(s).widgets, []);
  assert.deepEqual(
    home(s, 'phone').widgets.map(w => w.id),
    ['b']
  );
  const again = sessionReducer(s, redo('wall'))!;
  assert.deepEqual(
    home(again).widgets.map(w => w.id),
    ['a']
  );
  assert.equal(stackOf(again.undo, 'wall').redo.length, 0);
});

test('nothing to take back leaves the session as it is', () => {
  const s = run(start);
  assert.equal(sessionReducer(s, undo('wall')), s);
  assert.equal(sessionReducer(s, redo(null)), s);
});

test('a new edit after an Undo clears that stack’s redo, and only that one', () => {
  const s = run(
    start,
    addClock('wall', clock('a')),
    addClock('phone', clock('b')),
    undo('wall'),
    undo('phone'),
    addClock('wall', clock('c'))
  );
  assert.equal(stackOf(s.undo, 'wall').redo.length, 0);
  assert.equal(stackOf(s.undo, 'phone').redo.length, 1);
});

test('typing in one field is one step: Undo restores the value from before it', () => {
  const s = run(start, addClock('wall', clock('a')), title('wall', 'a', 'S'), title('wall', 'a', 'Sa'), title('wall', 'a', 'Sal'));
  assert.equal(stackOf(s.undo, 'wall').undo.length, 2);
  assert.equal(home(sessionReducer(s, undo('wall'))!).widgets[0].title, null);
});

test('leaving the field, or editing something else, ends the step', () => {
  const left = run(start, addClock('wall', clock('a')), title('wall', 'a', 'Sa'), sealed, title('wall', 'a', 'Sal'), undo('wall'));
  assert.equal(home(left).widgets[0].title, 'Sa');
  const elsewhere = run(
    start,
    addClock('wall', clock('a')),
    addClock('wall', clock('b', 4)),
    title('wall', 'a', 'Sa'),
    title('wall', 'b', 'X'),
    title('wall', 'a', 'Sal'),
    undo('wall')
  );
  assert.equal(home(elsewhere).widgets[0].title, 'Sa');
});

test('each drag is a step; a run of arrow-key nudges of one Widget is one', () => {
  const drag = (x: number) => inside('wall', d => placeWidget(d, d.pages[0].id, 'a', { x, y: 0, w: 2, h: 1 }), null);
  const dragged = run(start, addClock('wall', clock('a')), drag(1), drag(2), undo('wall'));
  assert.equal(home(dragged).widgets[0].x, 1);
  const nudge = (x: number) => inside('wall', d => placeWidget(d, d.pages[0].id, 'a', { x, y: 0, w: 2, h: 1 }), 'nudge:a');
  const nudged = run(start, addClock('wall', clock('a')), nudge(1), nudge(2), nudge(3), undo('wall'));
  assert.equal(home(nudged).widgets[0].x, 0);
});

test('edits that cancel out leave no step', () => {
  const s = run(start, addClock('wall', clock('a')), title('wall', 'a', 'S'), title('wall', 'a', ''));
  const back = sessionReducer(s, title('wall', 'a', null as unknown as string))!;
  assert.equal(stackOf(back.undo, 'wall').undo.length, 1);
});

test('a step says where it was made: its Page, and the Widget it touched', () => {
  const s = run(
    start,
    addClock('wall', clock('a')),
    inside('wall', d => renamePage(d, d.pages[0].id, 'Casa'))
  );
  const [added, renamed] = stackOf(s.undo, 'wall').undo;
  assert.deepEqual(added.where, { page: home(s).id, widget: 'a' });
  assert.deepEqual(renamed.where, { page: home(s).id, widget: null });
});

test('undoing a rename keeps every edit made inside the Dashboard since', () => {
  const s = run(
    start,
    onList(d => renameDashboard(d, 'wall', 'Casa')),
    addClock('wall', clock('a')),
    undo(null)
  );
  const wall = s.draft.dashboards.find(d => d.id === 'wall')!;
  assert.equal(wall.name, 'wall');
  assert.deepEqual(
    wall.pages[0].widgets.map(w => w.id),
    ['a']
  );
  assert.equal(sessionReducer(s, redo(null))!.draft.dashboards[0].name, 'Casa');
});

test('undoing a delete brings the Dashboard back as it was, at its place, without its stack', () => {
  const s = run(
    start,
    addClock('wall', clock('a')),
    onList(d => deleteDashboard(d, 'wall'))
  );
  assert.equal(s.undo.dashboards.wall, undefined, 'deleting a Dashboard throws its stack away');
  const back = sessionReducer(s, undo(null))!;
  assert.deepEqual(
    back.draft.dashboards.map(d => d.id),
    ['wall', 'phone']
  );
  assert.deepEqual(
    home(back).widgets.map(w => w.id),
    ['a']
  );
  assert.equal(stackOf(back.undo, 'wall').undo.length, 0);
});

test('undoing a create removes it, asking first once it has been edited', () => {
  const made = dashboard('kiosk');
  const created = run(
    start,
    onList(d => addDashboard(d, made))
  );
  assert.equal(undoAsks(created.undo, created.draft), null);
  const edited = sessionReducer(created, addClock('kiosk', clock('a')))!;
  assert.equal(undoAsks(edited.undo, edited.draft)?.id, 'kiosk');
  const undone = sessionReducer(edited, undo(null))!;
  assert.deepEqual(
    undone.draft.dashboards.map(d => d.id),
    ['wall', 'phone']
  );
  assert.equal(undone.undo.dashboards.kiosk, undefined, 'its edits go with it');
  // Redo puts it back as it was when undone, edits and all.
  assert.deepEqual(
    home(sessionReducer(undone, redo(null))!, 'kiosk').widgets.map(w => w.id),
    ['a']
  );
});

test('undoing a duplicate removes the copy, and leaves the original alone', () => {
  const s = run(
    start,
    onList(d => duplicateDashboard(d, 'wall', { name: 'Copy', slug: 'copy' }, ids('copy')).document),
    addClock('wall', clock('a')),
    undo(null)
  );
  assert.deepEqual(
    s.draft.dashboards.map(d => d.id),
    ['wall', 'phone']
  );
  assert.deepEqual(
    home(s).widgets.map(w => w.id),
    ['a']
  );
});

test('Publish, discard and a clean Draft adopting a Publish each leave every stack empty', () => {
  const edited = run(
    start,
    addClock('wall', clock('a')),
    onList(d => renameDashboard(d, 'phone', 'P'))
  );
  const emptied = (s: Session) => {
    assert.equal(stackOf(s.undo, null).undo.length + stackOf(s.undo, null).redo.length, 0);
    assert.deepEqual(s.undo.dashboards, {});
  };
  emptied(
    run(
      start,
      addClock('wall', clock('a')),
      { type: 'publishStarted', document: null },
      { type: 'publishEnded', outcome: { outcome: 'published', revision: 2 } }
    )
  );
  emptied(sessionReducer(edited, { type: 'reverted' })!);
  // A Restore or an import is a Publish of another document: the same end.
  emptied(
    sessionReducer(sessionReducer(edited, { type: 'publishStarted', document: base })!, {
      type: 'publishEnded',
      outcome: { outcome: 'published', revision: 2 },
    })!
  );
  // Undone back to clean, with redo still there: someone else's Publish is adopted.
  const clean = run(start, addClock('wall', clock('a')), undo('wall'));
  assert.equal(isDirty(clean), false);
  emptied(sessionReducer(clean, received(at(2, { dashboards: [] })))!);
});

test('while a Publish is out, Undo and Redo do nothing', () => {
  const s = run(start, addClock('wall', clock('a')), { type: 'publishStarted', document: null });
  assert.equal(sessionReducer(s, undo('wall')), s);
});

test('undoing a conflicted Draft back to its base adopts the latest Publish and clears the stacks', () => {
  const theirs = at(2, { dashboards: [dashboard('theirs')] });
  const conflicted = run(start, addClock('wall', clock('a')), title('wall', 'a', 'T'), received(theirs));
  assert.equal(inConflict(conflicted), true);
  const once = sessionReducer(conflicted, undo('wall'))!;
  assert.equal(inConflict(once), true, 'still changed: still in conflict');
  const twice = sessionReducer(once, undo('wall'))!;
  assert.equal(inConflict(twice), false);
  assert.equal(twice.base.revision, 2);
  assert.deepEqual(twice.draft, theirs.document);
  assert.deepEqual(twice.undo.dashboards, {});
});

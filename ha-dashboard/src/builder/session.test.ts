/**
 * Two admins at once: whatever order the subscription's events and the
 * Publishes' answers arrive in, a Draft is never silently replaced and never
 * Published over someone else's Publish.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { OHomeMyDocument, Published } from '../document/types';
import { addDashboard, newDashboard } from './draft';
import { canPublish, canReplace, inConflict, isDirty, sessionReducer, type Session, type SessionEvent } from './session';

const empty: OHomeMyDocument = { dashboards: [] };
const withDashboard = (slug: string): OHomeMyDocument =>
  addDashboard(
    empty,
    newDashboard({ name: slug, slug }, 'Home', () => slug)
  );
const at = (revision: number, document: OHomeMyDocument): Published => ({ revision, document });

/** Runs the events from no session, as the Builder starts. */
function run(...events: SessionEvent[]): Session {
  const s = events.reduce<Session | null>(sessionReducer, null);
  assert.ok(s, 'a session starts with the first document received');
  return s;
}

const received = (published: Published): SessionEvent => ({ type: 'received', published });
const edit = (slug: string): SessionEvent => ({
  type: 'edited',
  edit: d =>
    addDashboard(
      d,
      newDashboard({ name: slug, slug }, 'Home', () => slug)
    ),
});
const publish = (document: OHomeMyDocument | null): SessionEvent => ({ type: 'publishStarted', document });
const ended = (revision: number): SessionEvent => ({ type: 'publishEnded', outcome: { outcome: 'published', revision } });
const conflict: SessionEvent = { type: 'publishEnded', outcome: { outcome: 'conflict', message: 'stale' } };

test('nothing happens before the first document arrives', () => {
  assert.equal(sessionReducer(null, edit('wall')), null);
});

test('the first document is the base, and the Draft starts clean', () => {
  const s = run(received(at(3, empty)));
  assert.equal(s.base.revision, 3);
  assert.equal(isDirty(s), false);
  assert.equal(canPublish(s), false);
});

test('an edit makes the Draft dirty and publishable', () => {
  const s = run(received(at(0, empty)), edit('wall'));
  assert.equal(isDirty(s), true);
  assert.equal(canPublish(s), true);
  assert.equal(s.base.revision, 0);
});

test('a clean Draft follows every Publish by anyone', () => {
  const s = run(received(at(0, empty)), received(at(1, withDashboard('phone'))));
  assert.equal(s.base.revision, 1);
  assert.deepEqual(s.draft, withDashboard('phone'));
  assert.equal(inConflict(s), false);
});

test("a dirty Draft is never replaced by someone else's Publish, and is then in conflict", () => {
  const s = run(received(at(0, empty)), edit('wall'), received(at(1, withDashboard('phone'))));
  assert.deepEqual(s.draft, withDashboard('wall'), 'the Draft is kept');
  assert.equal(s.base.revision, 0);
  assert.equal(s.latest.revision, 1);
  assert.equal(inConflict(s), true);
  assert.equal(canPublish(s), false);
  assert.equal(canReplace(s), false);
});

test('reloading after a conflict discards the Draft for the newer document', () => {
  const s = run(received(at(0, empty)), edit('wall'), received(at(1, withDashboard('phone'))), { type: 'reverted' });
  assert.deepEqual(s.draft, withDashboard('phone'));
  assert.equal(s.base.revision, 1);
  assert.equal(inConflict(s), false);
  assert.equal(isDirty(s), false);
});

test('a Publish whose echo arrives first ends clean, at its revision', () => {
  const s = run(received(at(0, empty)), edit('wall'), publish(withDashboard('wall')), received(at(1, withDashboard('wall'))), ended(1));
  assert.equal(s.publishing, null);
  assert.equal(s.base.revision, 1);
  assert.equal(isDirty(s), false);
  assert.deepEqual(s.notice, { kind: 'published', revision: 1 });
});

test('a Publish whose answer arrives first ends clean, and its echo changes nothing', () => {
  const answered = run(received(at(0, empty)), edit('wall'), publish(withDashboard('wall')), ended(1));
  assert.equal(answered.base.revision, 1);
  assert.equal(isDirty(answered), false);
  assert.equal(inConflict(answered), false, 'the echo has not come, and is not someone else');

  const echoed = sessionReducer(answered, received(at(1, withDashboard('wall'))))!;
  assert.equal(echoed.base.revision, 1);
  assert.equal(inConflict(echoed), false);
});

test("someone else's Publish while ours is out does not count as ours", () => {
  // Both Builders started at 0; theirs reached the server first.
  const s = run(received(at(0, empty)), edit('wall'), publish(withDashboard('wall')), received(at(1, withDashboard('phone'))), conflict);
  assert.equal(inConflict(s), true);
  assert.deepEqual(s.draft, withDashboard('wall'), 'the refused Draft is kept until the admin reloads');
  assert.equal(canPublish(s), false);
});

test('a refused Publish stays refused even if the newer document is late', () => {
  const s = run(received(at(0, empty)), edit('wall'), publish(withDashboard('wall')), conflict);
  assert.equal(inConflict(s), true);
  // Still refused when it does arrive, and a reload takes it.
  const late = sessionReducer(s, received(at(1, withDashboard('phone'))))!;
  assert.equal(inConflict(late), true);
  assert.deepEqual(late.draft, withDashboard('wall'));
  const reloaded = sessionReducer(late, { type: 'reverted' })!;
  assert.equal(inConflict(reloaded), false);
  assert.deepEqual(reloaded.draft, withDashboard('phone'));
});

test('a refused restore of a clean Draft waits for a reload too', () => {
  const s = run(received(at(2, withDashboard('wall'))), publish(empty), received(at(3, withDashboard('phone'))), conflict);
  assert.equal(inConflict(s), true);
  assert.deepEqual(s.draft, withDashboard('wall'), 'not quietly moved on to what the other admin did');
});

test('a restore Publishes another document and the Draft becomes it', () => {
  const s = run(received(at(2, withDashboard('wall'))), edit('extra'), publish(empty), received(at(3, empty)), ended(3));
  assert.deepEqual(s.draft, empty);
  assert.equal(isDirty(s), false);
  assert.equal(s.base.revision, 3);
});

test("an import's document is the one the server sends back", () => {
  const migrated = withDashboard('imported');
  const answered = run(received(at(0, empty)), publish(null), ended(1));
  assert.equal(answered.base.revision, 1);
  const echoed = sessionReducer(answered, received(at(1, migrated)))!;
  assert.deepEqual(echoed.draft, migrated);
  assert.equal(isDirty(echoed), false);
});

test('edits wait while a Publish is out, and a second Publish is not started', () => {
  const out = run(received(at(0, empty)), edit('wall'), publish(withDashboard('wall')));
  assert.equal(sessionReducer(out, edit('more')), out);
  assert.equal(sessionReducer(out, publish(empty)), out);
  assert.equal(canPublish(out), false);
});

test('an invalid or failed Publish keeps the Draft and says why', () => {
  const s = run(received(at(0, empty)), edit('wall'), publish(withDashboard('wall')), {
    type: 'publishEnded',
    outcome: { outcome: 'invalid', message: 'dashboards[0].name: must be a non-empty string' },
  });
  assert.deepEqual(s.notice, { kind: 'failed', message: 'dashboards[0].name: must be a non-empty string' });
  assert.equal(canPublish(s), true);
  assert.equal(sessionReducer(s, { type: 'dismissed' })!.notice, null);
});

test('discarding a clean-able Draft returns to what is published', () => {
  const s = run(received(at(4, empty)), edit('wall'), { type: 'reverted' });
  assert.equal(isDirty(s), false);
  assert.equal(s.base.revision, 4);
});

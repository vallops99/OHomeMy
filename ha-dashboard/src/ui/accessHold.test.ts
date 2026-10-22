/**
 * Hold Apri to open, tap Chiudi to close, through the
 * pure state machine `AccessRow` drives.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { accessStatus, HINT_MS, HOLD_MS, holdStep, holdTimeout, IDLE, type Hold } from './accessHold';
import { DEFAULT_LOCALE, setViewerLocale } from '../i18n';

// In Italian, the copy of the house the panel was built for (#59).
setViewerLocale({ ...DEFAULT_LOCALE, language: 'it' });

const holding: Hold = { phase: 'holding', since: 1000 };

test('a press starts a hold', () => {
  assert.deepEqual(holdStep(IDLE, { type: 'press', at: 1000 }), { hold: holding, opens: false });
});

test('a hold kept for 700 ms opens, when its timer fires', () => {
  assert.deepEqual(holdStep(holding, { type: 'tick', at: 1000 + HOLD_MS }), { hold: IDLE, opens: true });
});

test('a timer that fires early does not open', () => {
  assert.deepEqual(holdStep(holding, { type: 'tick', at: 1000 + HOLD_MS - 1 }), { hold: holding, opens: false });
});

test('a release after 700 ms opens, should the timer not have fired yet', () => {
  assert.deepEqual(holdStep(holding, { type: 'release', at: 1000 + HOLD_MS }), { hold: IDLE, opens: true });
});

test('a release too soon opens nothing and shows the hint', () => {
  assert.deepEqual(holdStep(holding, { type: 'release', at: 1300 }), { hold: { phase: 'hint', since: 1300 }, opens: false });
});

test('the hint lasts 2.5 s', () => {
  const hint: Hold = { phase: 'hint', since: 1300 };
  assert.deepEqual(holdStep(hint, { type: 'tick', at: 1300 + HINT_MS - 1 }), { hold: hint, opens: false });
  assert.deepEqual(holdStep(hint, { type: 'tick', at: 1300 + HINT_MS }), { hold: IDLE, opens: false });
});

test('a press during the hint starts a new hold', () => {
  assert.deepEqual(holdStep({ phase: 'hint', since: 1300 }, { type: 'press', at: 2000 }), {
    hold: { phase: 'holding', since: 2000 },
    opens: false,
  });
});

test('a finger sliding off, or a cancelled pointer, drops the hold with no hint', () => {
  assert.deepEqual(holdStep(holding, { type: 'cancel' }), { hold: IDLE, opens: false });
});

test('a release with no hold under way does nothing', () => {
  assert.deepEqual(holdStep(IDLE, { type: 'release', at: 5000 }), { hold: IDLE, opens: false });
});

test('the keyboard opens at once', () => {
  assert.deepEqual(holdStep(IDLE, { type: 'key' }), { hold: IDLE, opens: true });
});

test('the next timer is the hold, then the hint, then none', () => {
  assert.equal(holdTimeout(holding), HOLD_MS);
  assert.equal(holdTimeout({ phase: 'hint', since: 0 }), HINT_MS);
  assert.equal(holdTimeout(IDLE), null);
});

// ---- the status line ----

test('a closed gate reads Chiuso, muted', () => {
  assert.deepEqual(accessStatus({ state: 'locked', unavailable: false }, IDLE, 'Chiuso'), { label: 'Chiuso', tone: 'muted' });
});

test('an open gate reads Aperto, in the accent', () => {
  assert.deepEqual(accessStatus({ state: 'unlocked', unavailable: false }, IDLE, 'Aperto'), { label: 'Aperto', tone: 'accent' });
  assert.deepEqual(accessStatus({ state: 'open', unavailable: false }, IDLE, 'Aperto'), { label: 'Aperto', tone: 'accent' });
});

test('while held, and while Home Assistant opens it, it reads Apertura…', () => {
  assert.deepEqual(accessStatus({ state: 'locked', unavailable: false }, holding, 'Chiuso'), { label: 'Apertura…', tone: 'accent' });
  assert.deepEqual(accessStatus({ state: 'unlocking', unavailable: false }, IDLE, 'In apertura'), { label: 'Apertura…', tone: 'accent' });
});

test('after a press too short it says how to open', () => {
  assert.deepEqual(accessStatus({ state: 'locked', unavailable: false }, { phase: 'hint', since: 0 }, 'Chiuso'), {
    label: 'Tieni premuto per aprire',
    tone: 'accent',
  });
});

test('any other state is worded as everywhere else', () => {
  assert.deepEqual(accessStatus({ state: 'jammed', unavailable: false }, IDLE, 'Bloccato'), { label: 'Bloccato', tone: 'muted' });
});

test('an Unavailable gate is a Fault, whatever the hold', () => {
  assert.deepEqual(accessStatus({ state: 'unavailable', unavailable: true }, holding, 'Non disponibile'), {
    label: 'Non disponibile',
    tone: 'alert',
  });
});

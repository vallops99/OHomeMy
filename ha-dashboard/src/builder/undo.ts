/**
 * Undo and Redo of the admin's edits to the Draft (#74, CONTEXT.md "Undo"),
 * as data `session.ts` keeps beside the Draft. Not the Publish history
 * (`history.ts`): going back past a Publish is a Restore.
 *
 * ## Stacks
 *
 * Each Dashboard has a stack of its own, and the Dashboard list has one.
 * Undo on a Dashboard's screen takes back that Dashboard's last edit only, so
 * a step there is a snapshot of the whole Dashboard before it. A step on the
 * list takes back only what it changed, so that edits made inside a
 * Dashboard since survive it:
 *
 * - a rename puts the old name back;
 * - a delete puts the Dashboard back as it was, at its old place;
 * - a create or a duplicate removes the Dashboard again, edits and all,
 *   which the Builder asks about first when it has been edited since
 *   (`undoAsks`).
 *
 * Deleting a Dashboard throws its stack away: undoing the delete brings the
 * Dashboard back, not its stack. Every step is an `Op`, and applying one
 * gives its inverse, which goes on the other stack: Redo is Undo's undo.
 *
 * ## Steps
 *
 * What a list edit was is read off the Draft before and after: a Dashboard
 * that appeared was created, one that went was deleted, one whose name
 * changed was renamed. A Dashboard edit's step is its snapshot, and where it
 * was made (`Where`), read the same way, so Undo can show it.
 *
 * Consecutive edits with the same merge key are one step, until something
 * else is edited, the admin leaves the field (`seal`), or Undo or Redo
 * runs. The key is decided by what the edit touched, never by a timer: by
 * default the one value it changed (typing in one field), none when it
 * changed several; a drag says none, so each drag is a step, and arrow-key
 * nudges name their Widget, so a run of them is one.
 *
 * No React: `undo.test.ts` runs this, through `sessionReducer`, under Node.
 */
import type { Dashboard, Id, OHomeMyDocument } from '../document/types';
import { sameJson } from './draft';

/** What applying a step does to the Draft. */
export type Op =
  /** That Dashboard, as this snapshot. */
  | { kind: 'dashboard'; dashboard: Dashboard }
  | { kind: 'rename'; id: Id; name: string }
  /** The Dashboard put back at `index` in the list. */
  | { kind: 'insert'; dashboard: Dashboard; index: number }
  /** The Dashboard removed; `made` is it as it was put in, to tell whether it has been edited since. */
  | { kind: 'remove'; id: Id; made: Dashboard };

/** Where a Dashboard edit was made: the Page it changed, and the Widget, if one. */
export type Where = { page: Id | null; widget: Id | null };

export type Step = { op: Op; where: Where | null };

export type Stack = { undo: Step[]; redo: Step[] };

/** A stack: a Dashboard's id, or `null` for the Dashboard list. */
export type Scope = Id | null;

export type Undo = {
  list: Stack;
  dashboards: Readonly<Record<Id, Stack>>;
  /** The last edit's stack and merge key, while the next edit with the same may join its step. */
  open: { scope: Scope; key: string } | null;
};

/** Which stack an edit goes on, and for a Dashboard's, how it merges. */
export type EditTarget =
  | { stack: 'list' }
  /**
   * `key`: absent to merge by the one value the edit changed; `null` never
   * to merge (a drag); a string to merge with edits of the same (a nudge).
   */
  | { stack: 'dashboard'; id: Id; key?: string | null };

export const EMPTY_UNDO: Undo = { list: { undo: [], redo: [] }, dashboards: {}, open: null };

const EMPTY_STACK: Stack = { undo: [], redo: [] };

export const stackOf = (undo: Undo, scope: Scope): Stack => (scope === null ? undo.list : (undo.dashboards[scope] ?? EMPTY_STACK));

const withStack = (undo: Undo, scope: Scope, stack: Stack): Undo =>
  scope === null ? { ...undo, list: stack } : { ...undo, dashboards: { ...undo.dashboards, [scope]: stack } };

const withoutStack = (undo: Undo, id: Id): Undo => {
  const { [id]: _dropped, ...dashboards } = undo.dashboards;
  return { ...undo, dashboards };
};

/** The stacks after an edit took the Draft from `before` to `after`. */
export function recordEdit(undo: Undo, target: EditTarget, before: OHomeMyDocument, after: OHomeMyDocument): Undo {
  if (target.stack === 'list') {
    const recorded = listOp(before, after);
    if (!recorded) return { ...undo, open: null };
    const stack = stackOf(undo, null);
    let next = withStack(undo, null, { undo: [...stack.undo, { op: recorded.op, where: null }], redo: [] });
    if (recorded.drops !== null) next = withoutStack(next, recorded.drops);
    return { ...next, open: null };
  }

  const was = before.dashboards.find(d => d.id === target.id);
  const now = after.dashboards.find(d => d.id === target.id);
  if (!was || !now || sameJson(was, now)) return undo;
  const key = target.key === undefined ? changedPath(was, now) : target.key;
  const stack = stackOf(undo, target.id);
  const open = key === null ? null : { scope: target.id, key };
  const top = stack.undo.at(-1);

  if (key !== null && top && undo.open?.scope === target.id && undo.open.key === key) {
    // The same field again: one step, from before the first of them. Edits
    // that cancel out leave no step at all.
    const merged = top.op.kind === 'dashboard' && sameJson(top.op.dashboard, now) ? stack.undo.slice(0, -1) : stack.undo;
    return { ...withStack(undo, target.id, { undo: merged, redo: [] }), open };
  }
  const step: Step = { op: { kind: 'dashboard', dashboard: was }, where: whereChanged(was, now) };
  return { ...withStack(undo, target.id, { undo: [...stack.undo, step], redo: [] }), open };
}

/** The admin left a field: the next edit to it is a step of its own. */
export const seal = (undo: Undo): Undo => (undo.open === null ? undo : { ...undo, open: null });

/**
 * Undo (`from: 'undo'`) or Redo (`'redo'`) on a stack: the Draft with its
 * top step applied, and the stacks with the step's inverse on the other
 * side. `null` when there is nothing to take back, or what the step names
 * is gone.
 */
export function travel(
  undo: Undo,
  scope: Scope,
  from: 'undo' | 'redo',
  draft: OHomeMyDocument
): { undo: Undo; draft: OHomeMyDocument; step: Step } | null {
  const stack = stackOf(undo, scope);
  const step = stack[from].at(-1);
  if (!step) return null;
  const applied = apply(step.op, draft);
  if (!applied) return null;
  const to = from === 'undo' ? 'redo' : 'undo';
  const inverse: Step = { op: applied.inverse, where: step.where };
  let next = withStack(undo, scope, { ...stack, [from]: stack[from].slice(0, -1), [to]: [...stack[to], inverse] } as Stack);
  // A Dashboard taken out of the list takes its own stack with it.
  if (step.op.kind === 'remove') next = withoutStack(next, step.op.id);
  return { undo: { ...next, open: null }, draft: applied.draft, step };
}

/**
 * The Dashboard an Undo on the list would remove although it has been edited
 * since it was made, so the Builder asks first; `null` when nothing needs
 * asking.
 */
export function undoAsks(undo: Undo, draft: OHomeMyDocument): Dashboard | null {
  const op = undo.list.undo.at(-1)?.op;
  if (op?.kind !== 'remove') return null;
  const now = draft.dashboards.find(d => d.id === op.id);
  return now && !sameJson(now, op.made) ? now : null;
}

function apply(op: Op, draft: OHomeMyDocument): { draft: OHomeMyDocument; inverse: Op } | null {
  const dashboards = draft.dashboards;
  switch (op.kind) {
    case 'dashboard': {
      const index = dashboards.findIndex(d => d.id === op.dashboard.id);
      if (index < 0) return null;
      return {
        draft: { ...draft, dashboards: dashboards.with(index, op.dashboard) },
        inverse: { kind: 'dashboard', dashboard: dashboards[index] },
      };
    }
    case 'rename': {
      const index = dashboards.findIndex(d => d.id === op.id);
      if (index < 0) return null;
      const current = dashboards[index];
      return {
        draft: { ...draft, dashboards: dashboards.with(index, { ...current, name: op.name }) },
        inverse: { kind: 'rename', id: op.id, name: current.name },
      };
    }
    case 'insert': {
      if (dashboards.some(d => d.id === op.dashboard.id)) return null;
      const next = [...dashboards];
      next.splice(Math.min(op.index, next.length), 0, op.dashboard);
      return { draft: { ...draft, dashboards: next }, inverse: { kind: 'remove', id: op.dashboard.id, made: op.dashboard } };
    }
    case 'remove': {
      const index = dashboards.findIndex(d => d.id === op.id);
      if (index < 0) return null;
      return {
        draft: { ...draft, dashboards: dashboards.filter(d => d.id !== op.id) },
        inverse: { kind: 'insert', dashboard: dashboards[index], index },
      };
    }
  }
}

/** What a list edit did, as the step that takes it back, and the Dashboard whose stack goes with it. */
function listOp(before: OHomeMyDocument, after: OHomeMyDocument): { op: Op; drops: Id | null } | null {
  const made = after.dashboards.find(d => !before.dashboards.some(b => b.id === d.id));
  if (made) return { op: { kind: 'remove', id: made.id, made }, drops: null };
  const index = before.dashboards.findIndex(d => !after.dashboards.some(a => a.id === d.id));
  if (index >= 0) return { op: { kind: 'insert', dashboard: before.dashboards[index], index }, drops: before.dashboards[index].id };
  const renamed = before.dashboards.find(d => after.dashboards.find(a => a.id === d.id)?.name !== d.name);
  if (renamed) return { op: { kind: 'rename', id: renamed.id, name: renamed.name }, drops: null };
  return null;
}

/**
 * The one value an edit changed, as a path through the Dashboard, or `null`
 * when it changed several, or a list's length. Items with an `id` are named
 * by it, so an edit to a Widget keeps its key when another is added before it.
 */
function changedPath(before: Dashboard, after: Dashboard): string | null {
  const paths: string[] = [];
  const walk = (a: unknown, b: unknown, path: string) => {
    if (paths.length > 1 || Object.is(a, b)) return;
    if (Array.isArray(a) && Array.isArray(b) && a.length === b.length) {
      a.forEach((item, i) => walk(item, b[i], `${path}/${idOf(item) ?? i}`));
    } else if (isRecord(a) && isRecord(b) && !Array.isArray(a) && !Array.isArray(b)) {
      for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) walk(a[key], b[key], `${path}/${key}`);
    } else if (!sameJson(a, b)) {
      paths.push(path);
    }
  };
  walk(before, after, '');
  return paths.length === 1 ? paths[0] : null;
}

/** The first Page whose content an edit changed, and the first Widget on it. */
function whereChanged(before: Dashboard, after: Dashboard): Where {
  const pages = new Set([...before.pages, ...after.pages].map(p => p.id));
  for (const id of pages) {
    const was = before.pages.find(p => p.id === id);
    const now = after.pages.find(p => p.id === id);
    if (was && now && sameJson(was, now)) continue;
    const widgets = new Set([...(was?.widgets ?? []), ...(now?.widgets ?? [])].map(w => w.id));
    for (const widget of widgets) {
      const a = was?.widgets.find(w => w.id === widget);
      const b = now?.widgets.find(w => w.id === widget);
      if (!a || !b || !sameJson(a, b)) return { page: id, widget };
    }
    return { page: id, widget: null };
  }
  return { page: null, widget: null };
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;
const idOf = (item: unknown): string | null => (isRecord(item) && typeof item.id === 'string' ? item.id : null);

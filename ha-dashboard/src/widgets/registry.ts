/**
 * Every Widget kind this frontend knows (#50), for the renderer and the
 * Builder.
 *
 * Each kind is a folder, `src/widgets/<kind>/`, whose `index.ts` default-
 * exports a `WidgetKind`. Vite finds them all here, so adding a kind touches
 * no shared file and two kinds added side by side never conflict. The folder
 * is named after the kind (`Widget.kind`), which is checked below.
 */
import type { Fields, WidgetSchema } from '../document/schema';
import type { WidgetKind } from './types';

const modules = import.meta.glob<{ default: WidgetKind<Fields> }>('./*/index.ts', { eager: true });

const KINDS: ReadonlyMap<string, WidgetKind> = new Map(
  Object.entries(modules).map(([path, module]) => {
    const kind = module.default;
    const folder = path.split('/')[1];
    if (kind.schema.kind !== folder) throw new Error(`src/widgets/${folder} declares kind "${kind.schema.kind}"; name the folder after it`);
    return [kind.schema.kind, kind];
  })
);

/** The kind of that name, or `undefined` for one this frontend does not know. */
export function widgetKind(kind: string): WidgetKind | undefined {
  return KINDS.get(kind);
}

/** Every kind's schema, for the Builder to offer. */
export function widgetSchemas(): WidgetSchema[] {
  return [...KINDS.values()].map(k => k.schema);
}

/** Every kind's own CSS, joined: the renderer puts it in the shadow root once. */
export const WIDGETS_CSS = [...KINDS.values()]
  .map(k => k.css ?? '')
  .filter(Boolean)
  .join('\n');

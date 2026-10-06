/**
 * What a Widget kind is to the renderer (#50): its schema, its component, and
 * any CSS of its own. Each kind is one folder under `src/widgets/`, found by
 * `registry.ts` with no list to edit; see the README's "Adding a Widget kind".
 */
import type { ComponentType } from 'react';
import type { Fields, SettingsOf, WidgetSchema } from '../document/schema';
import type { Widget } from '../document/types';

/** What a kind's component receives, once its Widget has passed the schema. */
export type WidgetProps<F extends Fields = Fields> = {
  /** The Widget as the document has it: `variant` and `title` are read from here. */
  widget: Widget;
  /** Its settings, checked, with defaults filled in and missing entities dropped. */
  settings: SettingsOf<F>;
};

export type WidgetKind<F extends Fields = Fields> = {
  schema: WidgetSchema<F>;
  /**
   * Fills the Widget's box, whatever its size: the box is a size container
   * named `widget` (`@container widget (max-width: 300px)`), so a component
   * adapts to its box rather than to the screen.
   */
  Component: ComponentType<WidgetProps<F>>;
  /**
   * The kind's own stylesheet, put once into the Dashboard's shadow root:
   * container queries and `:active` states, which inline styles cannot say.
   * Class names start with `ohm-<kind>-` so kinds never collide.
   */
  css?: string;
  /**
   * What a tap on the Widget does of itself, which decides how the renderer
   * honours its `on_tap` (#54; the README's "Tapping a Widget"):
   *
   * - `own` (the default): the kind acts on a tap (a toggle toggles), and
   *   keeps it. A Widget with `on_tap` gets an Open button beside it, a
   *   chevron, as a Row's entity kept its action and gained one (ADR-0010).
   * - `none`: a tap does nothing (a clock). With `on_tap` the whole box opens
   *   the Page.
   * - `page`: the kind is only a way to a Page (the Link): as `none`, and a
   *   Widget of it without an `on_tap` is skipped, since it would be a dead
   *   control.
   */
  tap?: 'own' | 'none' | 'page';
};

/** Declares a kind with its settings' types carried from schema to component. */
export function defineWidget<const F extends Fields>(kind: WidgetKind<F>): WidgetKind<F> {
  return kind;
}

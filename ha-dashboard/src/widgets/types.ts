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
};

/** Declares a kind with its settings' types carried from schema to component. */
export function defineWidget<const F extends Fields>(kind: WidgetKind<F>): WidgetKind<F> {
  return kind;
}

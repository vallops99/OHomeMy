/**
 * One Page on its proportional grid (#50): every Widget its kind's schema
 * accepts, each in its own box. A Widget the schema refuses (an unknown kind,
 * a Variant it lacks, a setting it does not take, an entity Home Assistant no
 * longer has) is skipped without a word, and so is one whose component
 * throws: a gap in the grid, never a broken Page.
 */
import { Component, useMemo, type ReactNode } from 'react';
import { validateWidget, type Fields, type SettingsOf } from '../document/schema';
import type { Page as PageType, Widget } from '../document/types';
import { useHouse } from '../ha';
import { widgetKind } from '../widgets/registry';
import type { WidgetKind } from '../widgets/types';
import { cellPlacement, gridVariables, type Overflow } from './grid';

type Shown = { widget: Widget; kind: WidgetKind; settings: SettingsOf<Fields> };

export function Page({ page, overflow }: { page: PageType; overflow: Overflow }) {
  const house = useHouse();
  const shown = useMemo(
    () =>
      page.widgets.flatMap((widget): Shown[] => {
        const kind = widgetKind(widget.kind);
        const valid = validateWidget(widget, kind?.schema, { grid: { ...page.grid, overflow }, house });
        if (!valid.ok || !kind) {
          if (import.meta.env.DEV) console.debug(`OHomeMy: skipped Widget ${widget.id}: ${valid.ok ? 'unknown kind' : valid.reason}`);
          return [];
        }
        return [{ widget, kind, settings: valid.settings }];
      }),
    [page, overflow, house]
  );

  return (
    <div className='ohm-page' data-overflow={overflow}>
      <div className='ohm-grid' style={gridVariables(page.grid)}>
        {shown.map(({ widget, kind, settings }) => (
          <div key={widget.id} className='ohm-widget' data-kind={widget.kind} data-variant={widget.variant} style={cellPlacement(widget)}>
            <SkipOnError widget={widget}>
              <kind.Component widget={widget} settings={settings} />
            </SkipOnError>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Renders nothing for a Widget whose component threw, rather than letting it
 * take the Page down. Keyed to the Widget, so a Publish that changes it gets
 * a fresh try.
 */
type SkipProps = { widget: Widget; children: ReactNode };
type SkipState = { widget: Widget; failed: boolean };

class SkipOnError extends Component<SkipProps, SkipState> {
  state: SkipState = { widget: this.props.widget, failed: false };

  static getDerivedStateFromProps(props: SkipProps, state: SkipState): Partial<SkipState> | null {
    return props.widget === state.widget ? null : { widget: props.widget, failed: false };
  }

  static getDerivedStateFromError(): Partial<SkipState> {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    if (import.meta.env.DEV) console.debug(`OHomeMy: Widget ${this.props.widget.id} failed`, error);
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

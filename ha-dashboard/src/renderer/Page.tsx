/**
 * One Page on its proportional grid (#50): every Widget its kind's schema
 * accepts, each in its own box. A Widget the schema refuses (an unknown kind,
 * a Variant it lacks, a setting it does not take, an entity Home Assistant no
 * longer has) is skipped without a word, and so is one whose component
 * throws: a gap in the grid, never a broken Page.
 *
 * Each Widget's `on_tap` is honoured here, the same for every kind
 * (`tap.ts`): the whole box opens its Page when the kind does nothing on a
 * tap, and an Open button beside the box does when the kind acts on one. A
 * Room Tile, the one exception (ADR-0016), draws its own way to the Page
 * from its surface, so nothing is added here.
 */
import { Component, useMemo, type ReactNode } from 'react';
import { Icon } from '../ui/Icon';
import { pressable } from '../ui/pressable';
import { validateWidget, type Fields, type SettingsOf } from '../document/schema';
import type { Page as PageType, Widget } from '../document/types';
import { useHouse } from '../ha';
import { tr } from '../i18n';
import { widgetKind } from '../widgets/registry';
import type { WidgetKind } from '../widgets/types';
import { cellPlacement, gridVariables, type Overflow } from './grid';
import { useDashboardNavigation } from './navigationContext';
import { widgetTap, type WidgetTap } from './tap';

type Shown = { widget: Widget; kind: WidgetKind; settings: SettingsOf<Fields>; tap: WidgetTap };

export function Page({ page, overflow }: { page: PageType; overflow: Overflow }) {
  const house = useHouse();
  const navigation = useDashboardNavigation();
  const shown = useMemo(
    () =>
      page.widgets.flatMap((widget): Shown[] => {
        const kind = widgetKind(widget.kind);
        const valid = validateWidget(widget, kind?.schema, { grid: { ...page.grid, overflow }, house });
        if (!valid.ok || !kind) {
          if (import.meta.env.DEV) console.debug(`OHomeMy: skipped Widget ${widget.id}: ${valid.ok ? 'unknown kind' : valid.reason}`);
          return [];
        }
        const tap = widgetTap(kind.tap, widget.on_tap, p => navigation.pageName(p) !== undefined);
        if (tap.as === 'skipped') {
          if (import.meta.env.DEV) console.debug(`OHomeMy: skipped Widget ${widget.id}: a ${widget.kind} with no Page to open`);
          return [];
        }
        return [{ widget, kind, settings: valid.settings, tap }];
      }),
    [page, overflow, house, navigation]
  );

  return (
    <div className='ohm-page' data-overflow={overflow}>
      <div className='ohm-grid' style={gridVariables(page.grid)}>
        {shown.map(({ widget, kind, settings, tap }) => (
          <div key={widget.id} className='ohm-cell' data-widget={widget.id} style={cellPlacement(widget)}>
            <div
              className='ohm-widget'
              data-kind={widget.kind}
              data-variant={widget.variant}
              {...(tap.as === 'box' && { ...pressable(() => navigation.open(tap.page)), style: undefined, 'data-opens': true })}
            >
              <SkipOnError widget={widget}>
                <kind.Component widget={widget} settings={settings} />
              </SkipOnError>
            </div>
            {tap.as === 'button' && (
              <button
                type='button'
                className='ohm-open'
                data-opens
                aria-label={tr('renderer.open', { page: navigation.pageName(tap.page) ?? '' })}
                onClick={() => navigation.open(tap.page)}
              >
                <Icon name='mdi:chevron-right' size={20} mirrored />
              </button>
            )}
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

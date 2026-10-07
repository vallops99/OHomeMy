/**
 * The Dashboard's frame (#54, ADR-0015): the Navbar along one edge, if the
 * Dashboard has one, and the Page filling the rest. The Page's grid takes its
 * rows from the height it is given, so a Navbar at the top or bottom takes
 * its height from the rows and one at the side its width from the columns;
 * nothing else changes.
 *
 * The Navbar is Casa Panel's NavDock (`src/ui/Dock.tsx` draws the same for
 * the label-driven panel): a `surface` bar, each item its icon over its
 * Page's name, the current one a `primary` pill. Along the top or bottom its
 * items share the bar's length; down a side they stack from the top. In Tabs
 * mode a dot marks another item with a Page open over its own.
 *
 * The edge is physical (`Navbar.edge`): right to left moves neither the bar
 * nor its items, only the text inside them.
 *
 * ## Home Assistant's sidebar
 *
 * A custom panel gets no toolbar from Home Assistant, so where Home Assistant
 * hides its sidebar for a narrow screen nothing would open it (#46). Home
 * Assistant tells the panel when that is (`narrow`), and there the frame
 * offers a Menu control that asks Home Assistant to open it, with the same
 * `hass-toggle-menu` event its own toolbars fire: first in the Navbar, or,
 * on a Dashboard without one, floating at the top corner on the sidebar's
 * side, which right to left is the right. It follows
 * Home Assistant's signal, not the device: on a wide screen the sidebar is
 * Home Assistant's to show, and a wall user set to "always hide the sidebar"
 * keeps it hidden. The event is only ever fired while `narrow`, where Home
 * Assistant opens its drawer; on a wide screen it would change the user's
 * sidebar setting instead.
 */
import type { ReactNode } from 'react';
import type { Navbar } from '../document/types';
import { tr } from '../i18n';
import { usePanelProps } from '../panel/panelProps';
import { Icon } from '../ui/Icon';
import type { NavbarEntry } from './navigation';

function openHomeAssistantMenu(from: HTMLElement) {
  // Composed, so it leaves the Dashboard's shadow root and reaches
  // `home-assistant-main`, which listens for it.
  from.dispatchEvent(new CustomEvent('hass-toggle-menu', { bubbles: true, composed: true }));
}

export function Frame({
  navbar,
  items,
  onItem,
  children,
}: {
  navbar: Navbar | null;
  items: NavbarEntry[];
  onItem: (id: string) => void;
  children: ReactNode;
}) {
  const { narrow } = usePanelProps();
  const menu = narrow && (
    <button type='button' className='ohm-navbar-item' onClick={e => openHomeAssistantMenu(e.currentTarget)}>
      <Icon name='mdi:menu' size={22} />
      <span className='ohm-navbar-name'>{tr('renderer.menu')}</span>
    </button>
  );

  // A Navbar with nothing to show is not drawn: an empty bar is a dead control.
  const bar = navbar && (items.length > 0 || menu) && (
    <nav className='ohm-navbar' aria-label={tr('renderer.navbar')}>
      {menu}
      {items.map(item => (
        <button
          key={item.id}
          type='button'
          className='ohm-navbar-item'
          aria-current={item.current ? 'page' : undefined}
          onClick={() => onItem(item.id)}
        >
          <Icon name={item.icon} size={22} />
          <span className='ohm-navbar-name'>{item.name}</span>
          {item.pageOpen && <span className='ohm-navbar-dot' aria-hidden />}
        </button>
      ))}
    </nav>
  );

  return (
    <div className='ohm-frame' data-edge={bar ? navbar?.edge : undefined}>
      {bar}
      <div className='ohm-frame-main'>
        {children}
        {!bar && narrow && (
          <button
            type='button'
            className='ohm-menu-float'
            aria-label={tr('renderer.menu')}
            onClick={e => openHomeAssistantMenu(e.currentTarget)}
          >
            <Icon name='mdi:menu' size={22} />
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * The frame's stylesheet, beside `RENDERER_CSS`. The Navbar sits in the same
 * gutters as the Page's padding, on its outer side and along its length; the
 * Page's own padding is the gap between the two.
 */
export const FRAME_CSS = `
  .ohm-frame {
    --ohm-gutter-y: clamp(var(--space-3), 3cqh, var(--space-6));
    --ohm-gutter-x: clamp(var(--space-3), 2.2cqw, var(--space-7));
    height: 100%;
    display: flex;
  }
  .ohm-frame[data-edge='top'], .ohm-frame[data-edge='bottom'] { flex-direction: column; }
  .ohm-frame[data-edge='bottom'] > .ohm-navbar, .ohm-frame[data-edge='right'] > .ohm-navbar { order: 1; }
  .ohm-frame:dir(rtl)[data-edge='left'] > .ohm-navbar { order: 1; }
  .ohm-frame:dir(rtl)[data-edge='right'] > .ohm-navbar { order: 0; }
  .ohm-frame-main { flex: 1; min-width: 0; min-height: 0; position: relative; }
  .ohm-frame-main > .ohm-notice { height: 100%; }

  .ohm-navbar {
    flex: none;
    display: flex;
    gap: var(--space-1);
    padding: 6px;
    box-sizing: border-box;
    background: var(--surface);
    border: 1px solid var(--line);
    border-radius: var(--radius-dock);
    direction: ltr;
  }
  .ohm-frame[data-edge='top'] > .ohm-navbar,
  .ohm-frame[data-edge='bottom'] > .ohm-navbar {
    height: var(--dock-height);
    justify-content: center;
  }
  .ohm-frame[data-edge='top'] > .ohm-navbar {
    margin: calc(var(--ohm-gutter-y) + env(safe-area-inset-top)) var(--ohm-gutter-x) 0;
  }
  .ohm-frame[data-edge='bottom'] > .ohm-navbar {
    margin: 0 var(--ohm-gutter-x) calc(var(--ohm-gutter-y) + env(safe-area-inset-bottom));
  }
  .ohm-frame[data-edge='left'] > .ohm-navbar,
  .ohm-frame[data-edge='right'] > .ohm-navbar {
    width: 100px;
    flex-direction: column;
  }
  .ohm-frame[data-edge='left'] > .ohm-navbar { margin: var(--ohm-gutter-y) 0 var(--ohm-gutter-y) calc(var(--ohm-gutter-x) + env(safe-area-inset-left)); }
  .ohm-frame[data-edge='right'] > .ohm-navbar { margin: var(--ohm-gutter-y) calc(var(--ohm-gutter-x) + env(safe-area-inset-right)) var(--ohm-gutter-y) 0; }

  .ohm-navbar-item {
    position: relative;
    min-width: 0;
    min-height: var(--target-min);
    padding: 0 var(--space-1);
    border: none;
    border-radius: calc(var(--radius-dock) - 6px);
    background: transparent;
    color: var(--ink-secondary);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 5px;
    font-family: inherit;
    font-size: var(--type-label-size);
    line-height: var(--type-label-line);
    font-weight: 500;
    cursor: pointer;
    touch-action: manipulation;
    transition: transform .12s ease;
  }
  .ohm-frame[data-edge='top'] .ohm-navbar-item,
  .ohm-frame[data-edge='bottom'] .ohm-navbar-item { flex: 1 1 0; max-width: 160px; }
  .ohm-frame[data-edge='left'] .ohm-navbar-item,
  .ohm-frame[data-edge='right'] .ohm-navbar-item { flex: none; height: calc(var(--dock-height) - 12px); }
  .ohm-navbar-item[aria-current='page'] { background: var(--primary); color: var(--on-primary); font-weight: 600; }
  .ohm-navbar-item:active { transform: scale(.96); }
  .ohm-navbar-item:focus-visible { outline: 2px solid var(--focus); outline-offset: 3px; }
  .ohm-navbar-name {
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    unicode-bidi: plaintext;
  }
  /* In ink, not accent: a Page left open is not something being on. */
  .ohm-navbar-dot {
    position: absolute;
    top: 10px;
    left: calc(50% + 14px);
    width: 8px;
    height: 8px;
    border-radius: var(--radius-pill);
    background: var(--ink);
  }

  .ohm-menu-float {
    position: absolute;
    top: calc(var(--space-2) + env(safe-area-inset-top));
    inset-inline-start: calc(var(--space-2) + env(safe-area-inset-left));
    width: var(--target-min);
    height: var(--target-min);
    padding: 0;
    border-radius: var(--radius-pill);
    border: 1px solid var(--line-strong);
    background: var(--surface);
    color: var(--ink-soft);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    touch-action: manipulation;
  }
  .ohm-menu-float:active { transform: scale(.96); }
`;

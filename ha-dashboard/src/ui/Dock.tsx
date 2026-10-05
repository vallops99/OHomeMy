/**
 * The Dock (#41, CONTEXT.md "Dock"): the right half of the floor, a fixed bar
 * of destinations, each its icon over its name. `dock.ts` decides what is in
 * it; this draws it, after the design system's `NavDock`: 100 px items, and
 * the current one a `primary` pill carrying `aria-current="page"`.
 *
 * The current item is still a button. Tapping it opens the Page already on
 * screen, which changes nothing -- the item is there to say where you are,
 * not to go anywhere.
 *
 * `NavDockBar` and `NavDockItem` are the NavDock itself, without the Dock's
 * destinations: the phone's tab bar (#45) is drawn with them too, so the two
 * bars cannot drift apart.
 */
import type { CSSProperties, ReactNode } from 'react';
import type { DockItem } from './dock';
import { Icon } from './Icon';
import { useNavigation } from './NavigationContext';
import { t } from './theme';

/** The bar's inset around its items. The items' radius is the bar's minus it, so the two nest. */
const PAD = 6;
/** An item's width, the design system's own. */
const ITEM_W = 100;

/** Casa Panel's NavDock frame (`cp-nav`): a `surface` bar, `dockHeight` tall, its items inset by `PAD`. */
export function NavDockBar({ label, style, children }: { label: string; style?: CSSProperties; children: ReactNode }) {
  return (
    <nav
      aria-label={label}
      style={{
        display: 'flex',
        gap: t.space[1],
        padding: PAD,
        boxSizing: 'border-box',
        height: t.size.dockHeight,
        borderRadius: t.radius.dock,
        background: t.color.surface,
        border: `1px solid ${t.color.line}`,
        ...style,
      }}
    >
      {children}
    </nav>
  );
}

/**
 * One NavDock item (`cp-nav-item`): its icon over its name, the current one a
 * `primary` pill. `width` is the Dock's fixed 100 px; without one the item
 * takes an equal share of the bar, as the phone's tabs do. `badge` is drawn
 * over the item's top right corner, clear of the icon.
 */
export function NavDockItem({
  icon,
  name,
  current,
  onPress,
  width,
  badge,
}: {
  icon: string;
  name: string;
  current: boolean;
  onPress: () => void;
  width?: number;
  badge?: ReactNode;
}) {
  return (
    <button
      type='button'
      className='dock-item'
      aria-current={current ? 'page' : undefined}
      onClick={onPress}
      style={{
        ...(width === undefined ? { flex: '1 1 0', minWidth: 0 } : { width, flexShrink: 0 }),
        position: 'relative',
        padding: 0,
        border: 'none',
        borderRadius: t.radius.dock - PAD,
        background: current ? t.color.primary : 'transparent',
        color: current ? t.color.onPrimary : t.color.inkSecondary,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 5,
        fontFamily: 'inherit',
        fontSize: t.type.label.size,
        lineHeight: t.type.label.lineHeight,
        fontWeight: current ? 600 : 500,
        whiteSpace: 'nowrap',
        cursor: 'pointer',
        touchAction: 'manipulation',
      }}
    >
      <Icon name={icon} size={22} />
      {name}
      {badge}
    </button>
  );
}

export function Dock({ items }: { items: DockItem[] }) {
  const { openPage } = useNavigation();
  return (
    <NavDockBar label='Pagine' style={{ flex: '0 0 auto' }}>
      {items.map(item => (
        <NavDockItem
          key={item.key}
          icon={item.icon}
          name={item.name}
          current={item.current}
          onPress={() => openPage(item.page)}
          width={ITEM_W}
        />
      ))}
    </NavDockBar>
  );
}

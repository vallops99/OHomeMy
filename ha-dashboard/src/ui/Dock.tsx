/**
 * The Dock (#41, CONTEXT.md "Dock"): the right half of the floor, a fixed bar
 * of destinations, each its icon over its name. `dock.ts` decides what is in
 * it; this draws it, after the design system's `NavDock`: 100 px items, and
 * the current one a `primary` pill carrying `aria-current="page"`.
 *
 * The current item is still a button. Tapping it opens the Page already on
 * screen, which changes nothing -- the item is there to say where you are,
 * not to go anywhere.
 */
import type { DockItem } from './dock';
import { Icon } from './Icon';
import { useNavigation } from './NavigationContext';
import { t } from './theme';

/** The bar's inset around its items. The items' radius is the bar's minus it, so the two nest. */
const PAD = 6;
/** An item's width, the design system's own. */
const ITEM_W = 100;

export function Dock({ items }: { items: DockItem[] }) {
  const { openPage } = useNavigation();
  return (
    <nav
      aria-label='Pagine'
      style={{
        flex: '0 0 auto',
        display: 'flex',
        gap: t.space[1],
        padding: PAD,
        boxSizing: 'border-box',
        height: t.size.dockHeight,
        borderRadius: t.radius.dock,
        background: t.color.surface,
        border: `1px solid ${t.color.line}`,
      }}
    >
      {items.map(item => (
        <button
          key={item.key}
          type='button'
          className='dock-item'
          aria-current={item.current ? 'page' : undefined}
          onClick={() => openPage(item.page)}
          style={{
            width: ITEM_W,
            flexShrink: 0,
            padding: 0,
            border: 'none',
            borderRadius: t.radius.dock - PAD,
            background: item.current ? t.color.primary : 'transparent',
            color: item.current ? t.color.onPrimary : t.color.inkSecondary,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 5,
            fontFamily: 'inherit',
            fontSize: t.type.label.size,
            lineHeight: t.type.label.lineHeight,
            fontWeight: item.current ? 600 : 500,
            whiteSpace: 'nowrap',
            cursor: 'pointer',
          }}
        >
          <Icon name={item.icon} size={22} />
          {item.name}
        </button>
      ))}
    </nav>
  );
}

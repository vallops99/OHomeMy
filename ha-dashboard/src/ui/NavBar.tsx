/**
 * Navigation to the secondary views (#8).
 *
 * A bottom bar, not an edge gesture and not drill-in tiles. The panel is used
 * standing, often one-handed and often by someone who is not Valerio: a
 * gesture has no affordance on a wall, and drill-in would overload tiles whose
 * press already toggles a light. A bar is the only one of the three that is
 * discoverable and unambiguous.
 *
 * The destinations are the four named on the map (#1, "Not yet specified"):
 * Clima, Sicurezza, Media, Servizi. None of their views exist yet, so a
 * destination whose screen has not been built renders visibly disabled rather
 * than as a button that does nothing when pressed. A dead control that looks
 * live is worse than one that admits it is not there.
 */
import { Icon } from './Icon';
import { t } from './theme';

export type NavDestination = {
  /** Italian, shown on the bar. */
  label: string;
  icon: string;
  /** Absent until that view is built -- see the note above. */
  onOpen?: () => void;
};

export type NavBarProps = {
  destinations: NavDestination[];
  colSpan?: number;
  rowSpan?: number;
};

export function NavBar({ destinations, colSpan = 1, rowSpan = 1 }: NavBarProps) {
  return (
    <div
      style={{
        gridColumn: `span ${colSpan}`,
        gridRow: `span ${rowSpan}`,
        display: 'flex',
        gap: t.space.sm,
        padding: t.space.sm,
        borderRadius: t.radius.tile,
        background: t.color.surface,
        border: `1px solid ${t.color.border}`,
        boxSizing: 'border-box',
      }}
    >
      {destinations.map(d => {
        const enabled = Boolean(d.onOpen);
        const fg = enabled ? t.color.textPrimary : t.color.textSecondary;
        return (
          <button
            key={d.label}
            type='button'
            disabled={!enabled}
            onClick={d.onOpen}
            title={enabled ? d.label : `${d.label}: non ancora disponibile`}
            style={{
              flex: 1,
              minWidth: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: t.space.xs,
              // The strip is 96 px tall and this fills it, clearing the
              // 64 px primary-control floor (ADR-0001) with room to spare.
              minHeight: t.touch.primary,
              borderRadius: t.radius.sm,
              border: 'none',
              background: 'transparent',
              color: fg,
              // Unbuilt destinations read as absent, not as broken.
              opacity: enabled ? 1 : 0.4,
              cursor: enabled ? 'pointer' : 'default',
              padding: 0,
            }}
          >
            <Icon name={d.icon} size={26} color={fg} />
            <span
              style={{ fontSize: t.font.caption, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}
            >
              {d.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

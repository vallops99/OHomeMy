/**
 * Swipe right to open a Page, and the chevron that does the same on a tap
 * (#27, ADR-0010). A Row has both, and since #32 so does a footer entity
 * with a Page of its own (CONTEXT.md, Derived): the same mechanism and the
 * same look, so one learned gesture works everywhere it appears.
 *
 * The swipe is bound on this wrapper and never threaded into `Tile`:
 * `CardBase` spreads unknown props after its own long-press handlers, so
 * passing pointer handlers through would replace them. The recipe and why
 * each option is (or is not) set is docs/research/row-swipe-gesture.md; the
 * decision itself is `rowSwipe.ts`.
 */
import { useDrag } from '@use-gesture/react';
import { useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { Icon } from './Icon';
import { SWIPE_ACTIVATION, swipeCommits, swipeOffset } from './rowSwipe';
import { t } from './theme';

/**
 * The spring-back after a swipe that did not open the Page. No primary source
 * gives a value for this (docs/research/row-swipe-gesture.md); it is short
 * enough to read as the row letting go rather than as an animation to wait for.
 */
const SPRING_BACK = 'transform 180ms ease-out';

export type SwipeToOpenProps = {
  /** What the swipe reveals: the name of where letting go will take you. */
  name: string;
  onOpen: () => void;
  /** The wrapper's box in its Region: this, not the child, is the flex item. */
  style?: CSSProperties;
  children: ReactNode;
};

export function SwipeToOpen({ name, onOpen, style, children }: SwipeToOpenProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState(0);
  const [settling, setSettling] = useState(false);
  const bind = useDrag(
    ({ first, last, tap, canceled, movement: [mx], velocity: [vx], direction: [dx], event, memo }) => {
      // A drag that starts inside a slider is the slider's, always. Decided
      // once, on the first event, and ignored for the rest of the gesture --
      // not cancelled, since `cancel()` leaves `tap` false and the click
      // guard would then swallow the slider's own tap-to-set.
      const owned: boolean = first ? (event.target as Element).closest('[data-gesture-owner]') !== null : memo;
      if (owned || tap) return owned;

      const x = swipeOffset(mx);
      if (!last) {
        setSettling(false);
        setOffset(x);
        return owned;
      }
      // A vertical scroll under `pan-y` ends the gesture with a
      // `pointercancel` that arrives as an ordinary last event.
      const aborted = canceled || event.type === 'pointercancel';
      // Only a row off its rest has a transition to end `settling` with.
      setSettling(x > 0);
      setOffset(0);
      if (swipeCommits({ offset: x, width: ref.current?.offsetWidth ?? 0, velocity: vx, direction: dx, aborted })) onOpen();
      return owned;
    },
    {
      axis: 'x',
      axisThreshold: { touch: SWIPE_ACTIVATION },
      threshold: SWIPE_ACTIVATION,
      // Cancels the click that ends a swipe, in the capture phase, so neither
      // the child's own action nor @hakit's ripple fires after a drag.
      filterTaps: true,
      tapsThreshold: SWIPE_ACTIVATION,
    }
  );

  return (
    <div
      ref={ref}
      {...bind()}
      style={{
        ...style,
        display: 'flex',
        position: 'relative',
        // The Region scrolls; a row translated right must not widen it.
        overflow: 'clip',
        // Vertical panning stays the browser's, horizontal is the swipe.
        touchAction: 'pan-y',
      }}
    >
      {/*
        What the swipe reveals: where letting go will take you. Mounted only
        while the row is off its rest: at rest it would bleed through the
        card's anti-aliased rounded corners as a green fleck at each one.
      */}
      {(offset > 0 || settling) && (
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            gap: t.space.sm,
            paddingInline: t.space.lg,
            borderRadius: t.radius.tile,
            background: t.color.activeStrong,
            color: t.color.onActiveStrong,
            fontSize: t.font.glanceM,
            fontWeight: 600,
            whiteSpace: 'nowrap',
          }}
        >
          {name}
          <Icon name='mdi:arrow-right' size={28} />
        </div>
      )}
      <div
        style={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          transform: `translateX(${offset}px)`,
          // Only on the way back: while dragging the row sits under the finger.
          transition: settling ? SPRING_BACK : 'none',
        }}
        onTransitionEnd={() => setSettling(false)}
      >
        {children}
      </div>
    </div>
  );
}

/**
 * The swipe's single-tap alternative (WCAG 2.5.1, ADR-0010). Its click and
 * key presses stop here, so opening the Page never also does the action of
 * whatever it sits on -- and Enter on it is not taken by an entity-less
 * tile's own key handler.
 */
export function OpenChevron({ label, onOpen, color = t.color.textSecondary }: { label: string; onOpen: () => void; color?: string }) {
  return (
    <button
      type='button'
      aria-label={label}
      onClick={e => {
        e.stopPropagation();
        onOpen();
      }}
      onKeyDown={e => e.stopPropagation()}
      style={{
        flexShrink: 0,
        width: t.touch.floor,
        height: t.touch.floor,
        padding: 0,
        border: 'none',
        background: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color,
        cursor: 'pointer',
      }}
    >
      <Icon name='mdi:chevron-right' size={32} />
    </button>
  );
}

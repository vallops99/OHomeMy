/**
 * A Page shown as a Popup (#28, CONTEXT.md "Popup", ADR-0009): variant D of
 * #24, full screen and opaque over whatever Page is underneath.
 *
 * `popupShape` (`./popup`) decides the layout from the Page's Placement: the
 * first camera in `right` fills the screen as the background, and everything
 * else floats as one centred row along the bottom, each thing in its own
 * Region's Rendering contract via `PlacementView`. The header carries the
 * title, the Feed's status, and the one way out, the close button.
 *
 * The background is the camera's live Feed (#29), its session opened when
 * the Popup mounts and closed when it unmounts -- for the Ring, a cloud
 * session that keeps the doorbell streaming, so it must not outlive the
 * Popup (docs/research/camera-streaming.md §4).
 *
 * This component never decides whether it is open. `Dashboard` mounts it
 * while the helper names a Page and unmounts it when the helper is cleared;
 * the close button only *asks* Home Assistant to clear it (`onClose`), so the
 * Popup stays up until every panel hears the same answer.
 *
 * Navigating from inside (a footer Area block, and anything later that calls
 * `openPage`) goes through this component's own `NavigationProvider`: the
 * Page opens underneath, on the panel's real navigation, *and* the helper is
 * cleared, which closes the Popup on every panel.
 */
import { useMemo, useRef, type PointerEvent } from 'react';
import { cameraMoving, useAreas, useEntities, useFeed, usePage } from '../ha';
import { FeedFrame } from './Feed';
import { TONE_COLOR, feedPhase, feedStatus } from './feeds';
import { Icon } from './Icon';
import { NavigationProvider, useNavigation, type Navigation } from './NavigationContext';
import { EmptyPageMessage, PlacementView } from './PlacementView';
import { activityGate, popupShape, popupTitle, slotKey } from './popup';
import { isPhone } from './device';
import { t } from './theme';

/** How often, at most, a touch is reported to Home Assistant (#23, decision 10). */
const ACTIVITY_INTERVAL_MS = 5_000;

/**
 * Over the panel and under @hakit's own entity modal (z-index 1000, mounted
 * into `<body>`), so a long-press on a gate inside the Popup still opens its
 * modal on top.
 */
const Z_POPUP = 900;

/** The dark gradients the header and the row sit on, so they read over any picture. */
const SCRIM = t.color.backdrop;

export type PopupProps = {
  /** The Page the helper names. */
  page: string;
  /** Ask Home Assistant to close the Popup (clear the helper). */
  onClose: () => void;
  /** Report a touch inside the Popup (press the activity helper). Paced here. */
  onActivity: () => void;
};

export function Popup({ page, onClose, onActivity }: PopupProps) {
  const layout = usePage(page);
  const areas = useAreas();
  const shape = popupShape(layout);
  const title = popupTitle(page, areas);
  const entities = useEntities();
  // An Unavailable camera is a Fault: no session, and no retrying.
  const feed = useFeed(shape.feed === null || shape.feed.unavailable ? null : shape.feed.id);
  const status = shape.feed === null ? null : feedStatus(feedPhase(shape.feed, feed), cameraMoving(shape.feed, entities.values()));

  const outer = useNavigation();
  const navigation = useMemo<Navigation>(
    () => ({
      page,
      openPage: next => {
        outer.openPage(next);
        onClose();
      },
    }),
    [page, outer, onClose]
  );

  // A ref, not state: the gate is bookkeeping for an event handler, nothing
  // renders from it. One gate for the Popup's life, so opening a new Page in
  // the helper (which remounts this) starts the pacing afresh.
  const gate = useRef(activityGate(ACTIVITY_INTERVAL_MS));
  const onPointerDown = (e: PointerEvent) => {
    // The close button is the one touch that is not activity: it asks for
    // the opposite of "keep this open".
    if (e.target instanceof Element && e.target.closest('[data-popup-close]')) return;
    if (gate.current(Date.now())) onActivity();
  };

  return (
    <NavigationProvider value={navigation}>
      <div
        role='dialog'
        aria-label={title.name}
        // Capture, so a touch counts even when the control under it stops
        // the event from bubbling (the slider, @hakit's press handling).
        onPointerDownCapture={onPointerDown}
        style={{ position: 'fixed', inset: 0, zIndex: Z_POPUP, background: t.color.ground, overflow: 'hidden' }}
      >
        {shape.feed ? (
          <FeedFrame camera={shape.feed} feed={feed} size='full' />
        ) : (
          shape.empty && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex' }}>
              <EmptyPageMessage />
            </div>
          )
        )}

        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            padding: t.space.lg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: t.space.lg,
            background: `linear-gradient(to bottom, ${SCRIM}, transparent)`,
          }}
        >
          {/*
            The title, and beside it the Feed's status (#24): `In diretta`
            only once the picture behind is live, so the header never claims
            a live picture that is not there.
          */}
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: t.space.md,
              minWidth: 0,
              color: t.color.textPrimary,
              // A phone's header cannot hold the title, the status and the close button on one line.
              ...(isPhone ? { flexWrap: 'wrap', rowGap: 0 } : {}),
            }}
          >
            <span style={{ alignSelf: 'center', display: 'flex' }}>
              <Icon name={title.icon} size={Math.round(t.font.glanceL * 1.1)} />
            </span>
            <span style={{ fontSize: t.font.glanceL, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {title.name}
            </span>
            {status && (
              <span
                style={{
                  flexShrink: 0,
                  fontSize: t.font.body,
                  fontWeight: 600,
                  color: TONE_COLOR[status.tone],
                }}
              >
                {status.text}
              </span>
            )}
          </div>
          <CloseButton onClose={onClose} />
        </div>

        {shape.row.length > 0 && (
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              padding: `${t.space.xl * 2}px ${t.space.md}px ${t.space.md}px`,
              display: 'flex',
              gap: t.space.sm,
              // `safe`: centred while the row fits, start-aligned once it
              // scrolls, so the first slot is never pushed off the left edge
              // where no scroll can reach it.
              justifyContent: 'safe center',
              alignItems: 'flex-end',
              overflowX: 'auto',
              // On a phone the slots stack, full width: side by side, two
              // gates cut each other's names down to a letter (ADR-0011).
              ...(isPhone ? { flexDirection: 'column', alignItems: 'stretch' } : {}),
              background: `linear-gradient(to top, ${SCRIM}, transparent)`,
            }}
          >
            {shape.row.map(slot => (
              <div
                key={slotKey(slot)}
                // A gate's width each, shrinking when more share the row
                // (`popupSlotW`, measured -- see tokens.ts).
                style={{
                  flex: isPhone ? '0 0 auto' : `0 1 ${t.layout.popupSlotW}px`,
                  minWidth: 0,
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <PlacementView region={slot.region} placed={slot.placed} home={false} />
              </div>
            ))}
          </div>
        )}
      </div>
    </NavigationProvider>
  );
}

/** The close button: round, top-right, translucent over the picture (#24, decision 4). */
function CloseButton({ onClose }: { onClose: () => void }) {
  const size = t.layout.popupClose;
  return (
    <button
      type='button'
      data-popup-close
      onClick={onClose}
      aria-label='Chiudi'
      title='Chiudi'
      style={{
        width: size,
        height: size,
        flexShrink: 0,
        borderRadius: t.radius.pill,
        border: `1px solid ${t.color.border}`,
        background: t.color.backdrop,
        backdropFilter: 'blur(6px)',
        color: t.color.textPrimary,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        padding: 0,
      }}
    >
      <Icon name='mdi:close' size={size / 2} />
    </button>
  );
}

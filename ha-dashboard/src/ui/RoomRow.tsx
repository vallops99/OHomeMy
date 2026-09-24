/**
 * One Area, collapsed to a full-width row -- the room-list shape restored
 * from variant D (#6) in place of the 227 px `RoomTile` grid tile (#8).
 *
 * Contents are Derived (CONTEXT.md): the row asks the Area for the entity
 * carrying `main` in the `light` Domain and renders that, plus a count of the
 * Area's `light`-Domain entities that are on. It never names an entity id, so
 * a rewired house changes nothing here.
 *
 * Interaction (#27): pressing the row body toggles the Area's `main` light,
 * the brightness slider is always visible and draggable so the row never
 * changes shape as the house changes state, and the Area's Page -- the same
 * one its footer block opens -- is reached by swiping the row right or by
 * tapping the trailing chevron. Holding the row does nothing: the @hakit light
 * modal is gone from Rows (ADR-0010).
 */
import { useDrag } from '@use-gesture/react';
import { useRef, useState } from 'react';
import { pickMain, useActions, type Area } from '../ha';
import { Icon } from './Icon';
import { brightnessPercent } from './lightState';
import { useNavigation } from './NavigationContext';
import { rowBox, rowStyle, useRowSlider } from './rowShape';
import { SWIPE_ACTIVATION, swipeCommits, swipeOffset } from './rowSwipe';
import { Slider } from './Slider';
import { stateLabel } from './stateLabel';
import { Tile } from './Tile';
import { t } from './theme';
// PROTOTYPE (#15): the row's phone modes.
import { ROW_MODE } from './phoneProto';

/**
 * The Area's temperature: what the room is, not what a device in it is.
 *
 * A `climate` entity's own `current_temperature` is preferred over any
 * `temperature` sensor, for the reason #8 found at house level: the house is
 * full of devices that report their own chip temperature, and an Amazon Echo
 * in Camera Chri wins a naive scan -- putting a speaker's self-heating on the
 * wall as the room's reading. Device class is not intent.
 *
 * A plain sensor is still used when the Area has no thermostat, since most
 * rooms have no `climate` entity at all -- but never one carrying an
 * `entity_category`, which is Home Assistant's own marker for plumbing.
 */
function areaTemperature(area: Area): string | null {
  const thermostat = area.entities.find(e => e.domain === 'climate' && !e.unavailable);
  const fromClimate = Number(thermostat?.attributes.current_temperature);
  if (thermostat && !Number.isNaN(fromClimate)) return `${fromClimate.toFixed(1)}°`;

  const sensor = area.entities.find(
    e => e.domain === 'sensor' && e.attributes.device_class === 'temperature' && !e.unavailable && !e.attributes.entity_category
  );
  if (!sensor) return null;
  const value = Number(sensor.state);
  if (Number.isNaN(value)) return null;
  const unit = (sensor.attributes.unit_of_measurement as string) ?? '°';
  return `${value.toFixed(1)}${unit}`;
}

/**
 * `<on>/<total> luci` for the Area, or `null` when the Area has no `light`
 * Domain entities at all.
 *
 * The Aggregate (the entity carrying the `main` Label -- CONTEXT.md) is
 * excluded from both the numerator and the denominator: it stands for the
 * other lights rather than being one more of them, so counting it alongside
 * them would double-count every light it aggregates.
 */
function lightCount(area: Area): { on: number; total: number } | null {
  const lights = area.entities.filter(e => e.domain === 'light');
  const individual = lights.filter(e => !e.labels.includes('main'));
  if (individual.length === 0) return null;
  return { on: individual.filter(e => e.state === 'on').length, total: individual.length };
}

export type RoomRowProps = {
  area: Area;
  /** MDI icon for the room. Defaults to a generic room glyph. */
  icon?: string;
};

/**
 * The spring-back after a swipe that did not open the Page. No primary source
 * gives a value for this (docs/research/row-swipe-gesture.md); it is short
 * enough to read as the row letting go rather than as an animation to wait for.
 */
const SPRING_BACK = 'transform 180ms ease-out';

export function RoomRow({ area, icon = 'mdi:sofa' }: RoomRowProps) {
  const actions = useActions();
  const { openPage } = useNavigation();
  const main = pickMain(area, 'light');
  const active = main?.state === 'on';
  const unavailable = main?.unavailable ?? false;
  const temperature = areaTemperature(area);
  const counts = lightCount(area);

  const slider = useRowSlider(brightnessPercent(main));

  const open = () => openPage(area.id);

  // The swipe, bound on our own wrapper and never threaded into `Tile`:
  // `CardBase` spreads unknown props after its own long-press handlers, so
  // passing pointer handlers through would replace them. The recipe and why
  // each option is (or is not) set is docs/research/row-swipe-gesture.md.
  const rowRef = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState(0);
  const [settling, setSettling] = useState(false);
  const bind = useDrag(
    ({ first, last, tap, canceled, movement: [mx], velocity: [vx], direction: [dx], event, memo }) => {
      // A drag that starts inside the slider is brightness, always. Decided
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
      if (swipeCommits({ offset: x, width: rowRef.current?.offsetWidth ?? 0, velocity: vx, direction: dx, aborted })) open();
      return owned;
    },
    {
      axis: 'x',
      axisThreshold: { touch: SWIPE_ACTIVATION },
      threshold: SWIPE_ACTIVATION,
      // Cancels the click that ends a swipe, in the capture phase, so neither
      // the toggle nor @hakit's ripple fires after the row was dragged.
      filterTaps: true,
      tapsThreshold: SWIPE_ACTIVATION,
    }
  );

  return (
    <div
      ref={rowRef}
      {...bind()}
      style={{
        // This wrapper, not the Tile, is the Region's flex child now.
        ...rowBox,
        // The card's own cap, or the wrapper outgrows it (tokens.ts).
        maxHeight: t.layout.tileMaxH,
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
            borderRadius: rowBox.borderRadius,
            background: t.color.activeStrong,
            color: t.color.onActiveStrong,
            fontSize: t.font.glanceM,
            fontWeight: 600,
          }}
        >
          {area.name}
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
        <Tile
          row
          entity={main}
          active={active}
          disableModal
          onClick={() => main && actions.toggle(main)}
          style={rowStyle({ active, unavailable })}
        >
          {/* PROTOTYPE (#15) */}
          {ROW_MODE !== 'off' ? (
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: t.space.xs }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: t.space.sm, minWidth: 0 }}>
                <span style={{ display: 'flex', color: unavailable ? t.color.fault : t.color.textSecondary }}>
                  <Icon name={icon} size={24} />
                </span>
                <span
                  style={{
                    flex: 1,
                    minWidth: 0,
                    fontSize: t.font.glanceM,
                    fontWeight: 600,
                    color: t.color.textPrimary,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {area.name}
                </span>
                {unavailable ? (
                  <span style={{ fontSize: t.font.body, color: t.color.fault, fontWeight: 700 }}>{stateLabel(main).toUpperCase()}</span>
                ) : (
                  counts && (
                    <span style={{ fontSize: t.font.body, color: t.color.textSecondary, flexShrink: 0 }}>
                      {counts.on}/{counts.total}
                    </span>
                  )
                )}
                <span style={{ fontSize: t.font.glanceM, color: t.color.textPrimary, flexShrink: 0 }}>{temperature ?? '--'}</span>
              </div>
              {ROW_MODE === 'twoLine' && !unavailable && (
                <div style={{ minWidth: 0 }} onClick={e => e.stopPropagation()}>
                  <Slider
                    value={slider.shown}
                    disabled={!main}
                    onChange={slider.track}
                    onChangeApplied={v => {
                      slider.track(v);
                      if (main) actions.setBrightness(main, v);
                    }}
                  />
                </div>
              )}
            </div>
          ) : (
            <>
              <span
                style={{ width: 34, display: 'flex', justifyContent: 'center', color: unavailable ? t.color.fault : t.color.textSecondary }}
              >
                <Icon name={icon} size={26} />
              </span>
              <span style={{ flex: 1, fontSize: t.font.glanceM, fontWeight: 600, color: t.color.textPrimary }}>{area.name}</span>

              {unavailable ? (
                // Never hidden, always visibly faulted (map Notes): the owner
                // standing at the panel must see that this room is unreachable.
                <span style={{ fontSize: t.font.body, color: t.color.fault, fontWeight: 700 }}>{stateLabel(main).toUpperCase()}</span>
              ) : (
                <>
                  {counts && (
                    <span style={{ fontSize: t.font.body, color: t.color.textSecondary, width: 120, flexShrink: 0 }}>
                      {counts.on}/{counts.total} luci
                    </span>
                  )}

                  <div style={{ width: 200, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                    <Slider
                      value={slider.shown}
                      disabled={!main}
                      onChange={slider.track}
                      onChangeApplied={v => {
                        slider.track(v);
                        if (main) actions.setBrightness(main, v);
                      }}
                    />
                  </div>
                </>
              )}

              <span
                style={{
                  fontSize: t.font.glanceM,
                  color: t.color.textPrimary,
                  width: 78,
                  flexShrink: 0,
                  textAlign: 'right',
                }}
              >
                {temperature ?? '--'}
              </span>
            </>
          )}
          {/*
            The swipe's single-tap alternative (WCAG 2.5.1, ADR-0010). Its
            click and key presses stop here, like the slider's, so opening
            the Page never also toggles the light -- and Enter on it is not
            taken by the entity-less row's own key handler.
          */}
          <button
            type='button'
            aria-label={`Apri ${area.name}`}
            onClick={e => {
              e.stopPropagation();
              open();
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
              color: t.color.textSecondary,
              cursor: 'pointer',
            }}
          >
            <Icon name='mdi:chevron-right' size={32} />
          </button>
        </Tile>
      </div>
    </div>
  );
}

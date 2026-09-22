/**
 * One Area, collapsed to a full-width row -- the room-list shape restored
 * from variant D (#6) in place of the 227 px `RoomTile` grid tile (#8).
 *
 * Contents are Derived (CONTEXT.md): the row asks the Area for the entity
 * carrying `main` in the `light` Domain and renders that, plus a count of the
 * Area's `light`-Domain entities that are on. It never names an entity id, so
 * a rewired house changes nothing here.
 *
 * Interaction is unchanged from `RoomTile` (#7): pressing the row body
 * toggles the Area's Aggregate, the brightness slider is always visible and
 * draggable so the row never changes shape as the house changes state, and a
 * long press opens the entity's detail modal.
 */
import { useState } from 'react';
import { pickMain, useActions, type Area, type Entity } from '../ha';
import { Icon } from './Icon';
import { Slider } from './Slider';
import { Tile } from './Tile';
import { t } from './theme';

/** Brightness 0-255 as Home Assistant reports it, as a 0-100 percentage. */
function brightnessPercent(entity: Entity | null): number {
  const raw = entity?.attributes.brightness;
  if (typeof raw !== 'number') return 0;
  return Math.round((raw / 255) * 100);
}

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

export function RoomRow({ area, icon = 'mdi:sofa' }: RoomRowProps) {
  const actions = useActions();
  const main = pickMain(area, 'light');
  const active = main?.state === 'on';
  const unavailable = main?.unavailable ?? false;
  const temperature = areaTemperature(area);
  const counts = lightCount(area);

  // The optimistic drag state lives in `Slider`, which owns the gesture and
  // the commit. This only mirrors what the slider reports so the row's own
  // notion of "current brightness" tracks the finger; the `from === live`
  // guard falls it back to the live value the instant a drag ends, rather
  // than staying pinned to a stale optimistic number (RoomTile, #7).
  const live = brightnessPercent(main);
  const [dragged, setDragged] = useState<{ value: number; from: number } | null>(null);
  const shown = dragged && dragged.from === live ? dragged.value : live;

  // Adjusting the slider must not also open the row's long-press modal over
  // the control being used -- see the note in `Slider`. The row's modal is
  // disarmed for as long as a slider gesture is in progress.
  const [sliding, setSliding] = useState(false);

  return (
    <Tile
      row
      entity={main}
      active={active}
      disableModal={sliding}
      onClick={() => main && actions.toggle(main)}
      style={{
        // Share the column with the other rows rather than taking a fixed
        // height: five Areas fill the panel, six share it, and the floor
        // below keeps a row readable at 2 m either way.
        flex: 1,
        minHeight: t.layout.rowRoom,
        borderRadius: t.radius.tile,
        gap: t.space.md,
        // `Tile` already applies its own horizontal padding via `cssStyles`
        // (t.space.md), so no second padding is added here -- see the report
        // note on the conflict this raised.
        background: unavailable ? t.color.faultSurface : t.color.surface,
        borderLeft: `6px solid ${unavailable ? t.color.fault : active ? t.color.active : 'transparent'}`,
      }}
    >
      <span style={{ width: 34, display: 'flex', justifyContent: 'center', color: unavailable ? t.color.fault : t.color.textSecondary }}>
        <Icon name={icon} size={26} />
      </span>
      <span style={{ flex: 1, fontSize: t.font.glanceM, fontWeight: 600, color: t.color.textPrimary }}>{area.name}</span>

      {unavailable ? (
        // Never hidden, always visibly faulted (map Notes): the owner
        // standing at the panel must see that this room is unreachable.
        <span style={{ fontSize: t.font.body, color: t.color.fault, fontWeight: 700 }}>NON DISPONIBILE</span>
      ) : (
        <>
          {counts && (
            <span style={{ fontSize: t.font.body, color: t.color.textSecondary, width: 120, flexShrink: 0 }}>
              {counts.on}/{counts.total} luci
            </span>
          )}

          <div style={{ width: 200, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
            <Slider
              value={shown}
              disabled={!main}
              onInteracting={setSliding}
              onChange={v => setDragged({ value: v, from: live })}
              onChangeApplied={v => {
                setDragged({ value: v, from: live });
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
    </Tile>
  );
}

/**
 * The home screen's most-used component: one Area, collapsed to a tile.
 *
 * Contents are Derived (CONTEXT.md): the tile asks the Area for the entity
 * carrying `main` in the `light` Domain and renders that. It never names an
 * entity id, so a rewired house changes nothing here.
 *
 * Interaction (decided in #7): pressing the tile body toggles the Area's
 * Aggregate, the brightness slider is always visible and draggable, and a
 * long press opens the entity's detail modal. The slider does not vanish when
 * the light is off -- a wall panel glanced at from 2 m should not change shape
 * as the house changes state.
 */
import { useState } from 'react';
import { pickMain, useActions, type Area, type Entity } from '../ha';
import { Icon } from './Icon';
import { Slider } from './Slider';
import { Tile } from './Tile';
import { onSurfaceFor, t } from './theme';

/** Brightness 0-255 as Home Assistant reports it, as a 0-100 percentage. */
function brightnessPercent(entity: Entity | null): number {
  const raw = entity?.attributes.brightness;
  if (typeof raw !== 'number') return 0;
  return Math.round((raw / 255) * 100);
}

/** The Area's temperature, if any sensor there reports one. */
function areaTemperature(area: Area): string | null {
  const sensor = area.entities.find(e => e.domain === 'sensor' && e.attributes.device_class === 'temperature' && !e.unavailable);
  if (!sensor) return null;
  const value = Number(sensor.state);
  if (Number.isNaN(value)) return null;
  const unit = (sensor.attributes.unit_of_measurement as string) ?? '°';
  return `${value.toFixed(1)}${unit}`;
}

export type RoomTileProps = {
  area: Area;
  /** MDI icon for the room. Defaults to a generic room glyph. */
  icon?: string;
  colSpan?: number;
  rowSpan?: number;
};

export function RoomTile({ area, icon = 'mdi:sofa', colSpan, rowSpan }: RoomTileProps) {
  const actions = useActions();
  const main = pickMain(area, 'light');
  const active = main?.state === 'on';
  const unavailable = main?.unavailable ?? false;
  const temperature = areaTemperature(area);

  // The slider is optimistic while dragging: Home Assistant round-trips take
  // long enough that a slider snapping back under the finger feels broken.
  // Tracking the live value alongside the drag lets us drop the optimistic
  // value during render once Home Assistant confirms, with no effect and no
  // cascading re-render.
  const live = brightnessPercent(main);
  const [drag, setDrag] = useState<{ value: number; from: number } | null>(null);
  const shown = drag && drag.from === live ? drag.value : live;

  const fg = onSurfaceFor({ active, unavailable });

  return (
    <Tile entity={main} active={active} colSpan={colSpan} rowSpan={rowSpan} onClick={() => main && actions.toggle(main)}>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: t.space.sm }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: t.space.sm, color: fg }}>
          <Icon name={icon} size={30} />
          <span style={{ fontSize: t.font.glanceM, fontWeight: 600, flex: 1 }}>{area.name}</span>
          {temperature && <span style={{ fontSize: t.font.body, opacity: 0.85 }}>{temperature}</span>}
        </div>

        {unavailable ? (
          // Never hidden, always visibly faulted (map Notes): the owner
          // standing at the panel must see that this room is unreachable.
          <div style={{ display: 'flex', alignItems: 'center', gap: t.space.xs, color: t.color.fault, fontSize: t.font.body }}>
            <Icon name='mdi:alert-circle' size={20} />
            <span>Non disponibile</span>
          </div>
        ) : (
          <>
            <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: t.space.sm }}>
              <div style={{ flex: 1, minWidth: 0 }} onClick={e => e.stopPropagation()}>
                <Slider
                  value={shown}
                  disabled={!main}
                  onChange={v => setDrag({ value: v, from: live })}
                  onChangeApplied={v => {
                    setDrag({ value: v, from: live });
                    if (main) actions.setBrightness(main, v);
                  }}
                />
              </div>
              <span
                style={{
                  fontSize: t.font.body,
                  color: fg,
                  opacity: 0.85,
                  minWidth: 52,
                  textAlign: 'right',
                  flexShrink: 0,
                }}
              >
                {active ? `${shown}%` : 'Spente'}
              </span>
            </div>
          </>
        )}
      </div>
    </Tile>
  );
}

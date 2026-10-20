/**
 * One `light` or `switch`, Placed on its own (#16).
 *
 * Not a `RoomTile`: a Room Tile collapses an Area and Derives its light from
 * the `main` Label, while this stands for exactly the entity that was Placed.
 * It keeps the old Row's *shape* -- a full-width row, marker, icon, name,
 * control (`rowShape.ts`).
 *
 * Pressing the body toggles the entity. A light that can be dimmed also gets
 * the brightness slider, optimistic until Home Assistant catches up
 * (`pending.ts`); anything else -- an on/off light, a switch -- shows its
 * state in the slider's place instead. A slider that moves and dims nothing
 * would be a dead control that looks live (see `supportsBrightness`).
 */
import { useActions, type Entity } from '../ha';
import { isPhone } from './device';
import { entityIcon, Icon } from './Icon';
import { brightnessPercent, supportsBrightness } from './lightState';
import { rowStyle, useRowSlider } from './rowShape';
import { Slider } from './Slider';
import { stateLabel } from './stateLabel';
import { Tile } from './Tile';
import { t } from './theme';

export type ToggleTileProps = {
  entity: Entity;
};

export function ToggleTile({ entity }: ToggleTileProps) {
  const actions = useActions();
  const active = entity.state === 'on';
  const unavailable = entity.unavailable;
  const dimmable = supportsBrightness(entity);

  const brightness = brightnessPercent(entity);
  const slider = useRowSlider(brightness);

  const sliderEl = <Slider value={brightness} onInteracting={slider.setSliding} onChangeApplied={v => actions.setBrightness(entity, v)} />;
  // On a phone the 200 px slider leaves the name a few letters; it folds
  // under the name, full width, as a phone Row's does (ADR-0011).
  const folded = isPhone && dimmable && !unavailable;

  return (
    <Tile
      row
      entity={entity}
      active={active}
      disableModal={slider.sliding}
      onClick={() => actions.toggle(entity)}
      style={rowStyle({ active, unavailable })}
    >
      <div
        style={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          flexDirection: folded ? 'column' : 'row',
          alignItems: folded ? 'stretch' : 'center',
          gap: folded ? t.space.xs : t.space.md,
        }}
      >
        <div style={{ flex: folded ? undefined : 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: t.space.md }}>
          <span
            style={{ width: 34, display: 'flex', justifyContent: 'center', color: unavailable ? t.color.fault : t.color.textSecondary }}
          >
            <Icon name={unavailable ? 'mdi:alert-circle' : entityIcon(entity)} size={26} />
          </span>
          <span
            title={entity.name}
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
            {entity.name}
          </span>
        </div>

        {unavailable ? (
          // Always rendered, never hidden (CONTEXT.md, Unavailable).
          <span style={{ fontSize: t.font.body, color: t.color.fault, fontWeight: 700 }}>{stateLabel(entity).toUpperCase()}</span>
        ) : dimmable ? (
          <div style={folded ? { minWidth: 0 } : { width: 200, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
            {sliderEl}
          </div>
        ) : (
          <span style={{ fontSize: t.font.body, color: t.color.textSecondary, flexShrink: 0 }}>{stateLabel(entity)}</span>
        )}
      </div>
    </Tile>
  );
}

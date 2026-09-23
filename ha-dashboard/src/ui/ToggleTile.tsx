/**
 * One `light` or `switch`, Placed on its own (#16).
 *
 * Not a `RoomRow`: a Row collapses an Area and Derives its light from the
 * `main` Label, while this stands for exactly the entity that was Placed. It
 * takes the Row's *shape* -- a full-width row, marker, icon, name, control --
 * so a lone light standing next to an Area's Row in `right` reads as the same
 * kind of thing, one level down.
 *
 * Pressing the body toggles the entity. A light that can be dimmed also gets
 * the brightness slider, with the same optimistic-drag handling as
 * `RoomRow` (`rowShape.ts`); anything else -- an on/off light, a switch -- shows its state in
 * the slider's place instead. A slider that moves and dims nothing would be
 * a dead control that looks live (see `supportsBrightness`).
 */
import { useActions, type Entity } from '../ha';
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

  const slider = useRowSlider(brightnessPercent(entity));

  return (
    <Tile
      row
      entity={entity}
      active={active}
      disableModal={slider.sliding}
      onClick={() => actions.toggle(entity)}
      style={rowStyle({ active, unavailable })}
    >
      <span style={{ width: 34, display: 'flex', justifyContent: 'center', color: unavailable ? t.color.fault : t.color.textSecondary }}>
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

      {unavailable ? (
        // Always rendered, never hidden (CONTEXT.md, Unavailable).
        <span style={{ fontSize: t.font.body, color: t.color.fault, fontWeight: 700 }}>{stateLabel(entity).toUpperCase()}</span>
      ) : dimmable ? (
        <div style={{ width: 200, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
          <Slider
            value={slider.shown}
            onInteracting={slider.setSliding}
            onChange={slider.track}
            onChangeApplied={v => {
              slider.track(v);
              actions.setBrightness(entity, v);
            }}
          />
        </div>
      ) : (
        <span style={{ fontSize: t.font.body, color: t.color.textSecondary, flexShrink: 0 }}>{stateLabel(entity)}</span>
      )}
    </Tile>
  );
}

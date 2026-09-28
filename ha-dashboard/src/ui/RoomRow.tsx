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
 * tapping the trailing chevron. The slider is there only when that light can
 * be dimmed at all (#37): on an on/off light, or on no light, it would move
 * and change nothing. Being dimmable is what a light is, not a state it is
 * in, so the row still never changes shape as the house does. Holding the row does nothing: the @hakit light
 * modal is gone from Rows (ADR-0010).
 */
import { pickMain, useActions, type Area } from '../ha';
import { Icon } from './Icon';
import { isPhone } from './device';
import { brightnessPercent, supportsBrightness } from './lightState';
import { useNavigation } from './NavigationContext';
import { roomTemperature } from './roomTemperature';
import { rowBox, rowStyle, useRowSlider } from './rowShape';
import { Slider } from './Slider';
import { stateLabel } from './stateLabel';
import { OpenChevron, SwipeToOpen } from './SwipeToOpen';
import { Tile } from './Tile';
import { t } from './theme';

/**
 * `<on>/<total> luci` for the Area, or `null` when the Area has no `light`
 * Domain entities at all.
 *
 * The Aggregate (the entity carrying the `main` Label -- CONTEXT.md) is
 * excluded from both the numerator and the denominator: it stands for the
 * other lights rather than being one more of them, so counting it alongside
 * them would double-count every light it aggregates. A `main` light with no
 * others beside it aggregates nothing -- it is the Area's only light -- so it
 * counts as itself, and the Row reads `0/1` or `1/1`.
 */
function lightCount(area: Area): { on: number; total: number } | null {
  const lights = area.entities.filter(e => e.domain === 'light');
  const others = lights.filter(e => !e.labels.includes('main'));
  const counted = others.length > 0 ? others : lights;
  if (counted.length === 0) return null;
  return { on: counted.filter(e => e.state === 'on').length, total: counted.length };
}

export type RoomRowProps = {
  area: Area;
  /** MDI icon for the room. Defaults to a generic room glyph. */
  icon?: string;
};

export function RoomRow({ area, icon = 'mdi:sofa' }: RoomRowProps) {
  const actions = useActions();
  const { openPage } = useNavigation();
  const main = pickMain(area, 'light');
  const active = main?.state === 'on';
  const unavailable = main?.unavailable ?? false;
  const dimmable = main !== null && supportsBrightness(main);
  const temperature = roomTemperature(area);
  const counts = lightCount(area);

  const slider = useRowSlider(brightnessPercent(main));

  const open = () => openPage(area.id);

  return (
    // The swipe surface, not the Tile, is the Region's flex child, capped at
    // the card's own height or it outgrows it (tokens.ts).
    <SwipeToOpen name={area.name} onOpen={open} style={{ ...rowBox, maxHeight: t.layout.tileMaxH }}>
      <Tile
        row
        entity={main}
        active={active}
        disableModal
        onClick={() => main && actions.toggle(main)}
        style={rowStyle({ active, unavailable })}
      >
        {isPhone ? (
          // The phone Row (ADR-0011): the wall Row's fixed columns (count
          // 120, slider 200, temperature 78) sum past a phone's width on
          // their own, so the Row folds in two -- the reading on one line,
          // the slider the full width under it, where a thumb can use it.
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
            {!unavailable && dimmable && (
              <div style={{ minWidth: 0 }} onClick={e => e.stopPropagation()}>
                <Slider
                  value={slider.shown}
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

                {/* Held empty without a slider, so the temperature stays in
                    the same column as every other Row's in the Region. */}
                <div style={{ width: 200, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                  {dimmable && (
                    <Slider
                      value={slider.shown}
                      onChange={slider.track}
                      onChangeApplied={v => {
                        slider.track(v);
                        if (main) actions.setBrightness(main, v);
                      }}
                    />
                  )}
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
        <OpenChevron label={`Apri ${area.name}`} onOpen={open} />
      </Tile>
    </SwipeToOpen>
  );
}

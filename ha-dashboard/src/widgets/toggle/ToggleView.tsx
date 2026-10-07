/**
 * The toggle's shape (#50): `ToggleTile`'s job, laid out by its box rather
 * than by the device. Built on `Tile`, so a long press still opens Home
 * Assistant's entity dialog, and coloured through the theme's custom
 * properties, so a theme or mode change reaches it.
 *
 * Its own file, apart from the Widget, so a Group of lights draws each
 * member the same way (#52).
 */
import type { CSSProperties } from 'react';
import type { Variant } from '../../document/schema';
import { useActions, type Entity } from '../../ha';
import { entityIcon, Icon } from '../../ui/Icon';
import { brightnessPercent, supportsBrightness } from '../../ui/lightState';
import { useRowSlider } from '../../ui/rowShape';
import { Slider } from '../../ui/Slider';
import { stateLabel } from '../../ui/stateLabel';
import { Tile } from '../../ui/Tile';
import { v } from '../../ui/vars';

/** Surface and border per tone, as Casa Panel's room tile has them. */
const SURFACE = {
  off: { background: 'var(--surface-tile)', borderColor: 'var(--line-tile)' },
  on: { background: 'var(--lit-surface)', borderColor: 'var(--lit-line)' },
  alert: { background: 'var(--alert-surface)', borderColor: 'var(--alert-line)' },
};

export type ToggleViewProps = {
  entity: Entity;
  variant: Variant;
  /** The box's size: the whole Widget's, or a Group's row. */
  style?: CSSProperties;
};

export function ToggleView({ entity, variant, style }: ToggleViewProps) {
  const actions = useActions();
  const slider = useRowSlider(brightnessPercent(entity));

  const unavailable = entity.unavailable;
  const on = entity.state === 'on';
  const tone = unavailable ? 'alert' : on ? 'on' : 'off';
  const dimmable = supportsBrightness(entity) && !unavailable;
  const slides = dimmable && variant === 'full';
  const state = unavailable
    ? stateLabel(entity).toUpperCase()
    : on && dimmable
      ? `${stateLabel(entity)} · ${slider.shown}%`
      : stateLabel(entity);

  return (
    <Tile
      row
      entity={entity}
      active={on}
      disableModal={slider.sliding}
      onClick={() => {
        if (!unavailable) actions.toggle(entity);
      }}
      // Inline, so it wins over `Tile`'s own surface, which is drawn in
      // fixed values; and the box, not `Tile`'s row cap or floor, sets the
      // height. The padding shrinks in a short box (`index.ts`); in a
      // Group's card, which sets none, it is the full one.
      style={{
        ...SURFACE[tone],
        height: '100%',
        maxHeight: 'none',
        minHeight: 0,
        padding: 'var(--ohm-toggle-pad, var(--space-4))',
        ...style,
      }}
    >
      <div className='ohm-toggle' data-variant={variant} data-slides={slides} data-tone={tone}>
        <span className='ohm-toggle-icon'>
          <Icon name={unavailable ? 'mdi:alert-circle' : entityIcon(entity)} size={30} />
        </span>
        <span className='ohm-toggle-text'>
          <span className='ohm-toggle-title' dir='auto'>
            {entity.name}
          </span>
          <span className='ohm-toggle-state'>{state}</span>
        </span>
        {slides && (
          <div className='ohm-toggle-slider' onClick={e => e.stopPropagation()}>
            <Slider
              value={slider.shown}
              thickness={v.size.targetControl}
              onInteracting={slider.setSliding}
              onChange={slider.track}
              onChangeApplied={v => {
                slider.track(v);
                actions.setBrightness(entity, v);
              }}
            />
          </div>
        )}
      </div>
    </Tile>
  );
}

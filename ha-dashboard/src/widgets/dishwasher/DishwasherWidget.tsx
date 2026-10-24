/**
 * The Dishwasher Widget (#81, ADR-0019): a device's state, countdown,
 * progress, warnings and controls, read off the entities its settings name.
 * Sizes follow the box (`index.ts`). A tap outside its controls does nothing.
 */
import { shownTitle } from '../../document/schema';
import { useActions, useEntityState } from '../../ha';
import { tr } from '../../i18n';
import { Icon } from '../../ui/Icon';
import { FaultTile } from '../../ui/FaultTile';
import { stateLabel } from '../../ui/stateLabel';
import { useNow } from '../../ui/useNow';
import type { WidgetProps } from '../types';
import { dishwasher } from './dishwasher';
import { HoldButton } from './HoldButton';
import type { dishwasherSchema } from './schema';

export function DishwasherWidget({ widget, settings }: WidgetProps<(typeof dishwasherSchema)['settings']>) {
  const actions = useActions();
  const now = useNow();
  const state = useEntityState(settings.state);
  const view = dishwasher(
    {
      state,
      endsAt: useEntityState(settings.ends_at),
      progress: useEntityState(settings.progress),
      door: useEntityState(settings.door),
      salt: useEntityState(settings.salt),
      rinseAid: useEntityState(settings.rinse_aid),
      remoteStart: useEntityState(settings.remote_start),
      chosen: {
        start: settings.start !== null,
        stop: settings.stop !== null,
        resume: settings.resume !== null,
        pause: settings.pause !== null,
      },
    },
    now
  );
  const title = shownTitle(widget.title, tr('dishwasher.title'));

  if (view.fault) {
    return (
      <div className='ohm-dishwasher' data-variant={widget.variant} data-fault>
        <FaultTile
          icon='mdi:dishwasher-alert'
          label={title !== '' ? title : (state?.name ?? tr('dishwasher.title'))}
          detail={stateLabel(state)}
          style={{ height: '100%' }}
        />
      </div>
    );
  }

  const press = (id: string | null) => {
    if (id === null) return;
    if (id.startsWith('script.')) actions.call('script', 'turn_on', id);
    else actions.press(id);
  };
  const { controls } = view;
  const compact = widget.variant === 'compact';

  return (
    <div className='ohm-dishwasher' data-variant={widget.variant} data-tone={view.line.tone}>
      <span className='ohm-dishwasher-head'>
        <span className='ohm-dishwasher-icon'>
          <Icon name='mdi:dishwasher' size={compact ? 20 : 24} />
        </span>
        {title !== '' && (
          <span className='ohm-dishwasher-title' dir='auto'>
            {title}
          </span>
        )}
      </span>
      <span className='ohm-dishwasher-line'>
        <span className='ohm-dishwasher-state' data-tone={view.line.tone}>
          {view.line.text}
        </span>
        {view.countdown !== null && <span className='ohm-dishwasher-countdown'>{view.countdown}</span>}
      </span>
      {!compact && view.progress !== null && (
        <span className='ohm-dishwasher-bar' role='progressbar' aria-valuemin={0} aria-valuemax={100} aria-valuenow={view.progress}>
          <span className='ohm-dishwasher-bar-fill' style={{ width: `${Math.max(0, Math.min(100, view.progress))}%` }} />
        </span>
      )}
      {!compact && (view.door !== null || view.warnings.length > 0) && (
        <span className='ohm-dishwasher-meta'>
          {view.door !== null && <span>{view.door}</span>}
          {view.warnings.map(w => (
            <span key={w} className='ohm-dishwasher-warning'>
              {w}
            </span>
          ))}
        </span>
      )}
      {!compact && (controls.start || controls.stop || controls.resume || controls.pause) && (
        <span className='ohm-dishwasher-controls'>
          {controls.start && (
            <span className='ohm-dishwasher-start'>
              <button
                type='button'
                className='ohm-dishwasher-button casa-press'
                data-primary
                disabled={controls.start.disabled}
                onClick={() => press(settings.start)}
              >
                <span className='ohm-dishwasher-button-face'>
                  <Icon name='mdi:play' size={20} />
                  {tr('dishwasher.start')}
                </span>
              </button>
              {controls.start.hint !== null && <span className='ohm-dishwasher-hint'>{controls.start.hint}</span>}
            </span>
          )}
          {controls.resume && (
            <button type='button' className='ohm-dishwasher-button casa-press' data-primary onClick={() => press(settings.resume)}>
              <span className='ohm-dishwasher-button-face'>
                <Icon name='mdi:play' size={20} />
                {tr('dishwasher.resume')}
              </span>
            </button>
          )}
          {controls.pause && (
            <button type='button' className='ohm-dishwasher-button casa-press' onClick={() => press(settings.pause)}>
              <span className='ohm-dishwasher-button-face'>
                <Icon name='mdi:pause' size={20} />
                {tr('dishwasher.pause')}
              </span>
            </button>
          )}
          {controls.stop && (
            <HoldButton label={tr('dishwasher.stop')} icon={<Icon name='mdi:square' size={20} />} onAct={() => press(settings.stop)} />
          )}
        </span>
      )}
    </div>
  );
}

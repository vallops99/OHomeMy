/**
 * The Indoor Reading Widget (#65): `ui/Hero.tsx`'s look, on the ground with
 * no card, no border and no fill. That borderlessness is Casa Panel's
 * "Arrivo calmo" (#6, #44), not an oversight: a frame would be one more
 * thing to read before the number. Sizes follow the box (`index.ts`).
 */
import { shownTitle } from '../../document/schema';
import { useEntityState } from '../../ha';
import { tr } from '../../i18n';
import { Icon } from '../../ui/Icon';
import type { WidgetProps } from '../types';
import { indoorReading } from './indoorReading';
import type { indoorReadingSchema } from './schema';

export function IndoorReadingWidget({ widget, settings }: WidgetProps<(typeof indoorReadingSchema)['settings']>) {
  const reading = indoorReading(useEntityState(settings.temperature), useEntityState(settings.humidity));
  const title = shownTitle(widget.title, tr('indoorReading.title'));
  return (
    <div className='ohm-indoor_reading' data-variant={widget.variant}>
      <span className='ohm-indoor_reading-number' data-fault={reading.fault || undefined}>
        {reading.temperature}
      </span>
      <span className='ohm-indoor_reading-lines'>
        {/* An Unavailable temperature keeps its line even untitled: it is never hidden. */}
        {(title !== '' || reading.fault) && (
          <span className='ohm-indoor_reading-title' data-fault={reading.fault || undefined}>
            <span className='ohm-indoor_reading-icon'>
              <Icon name={reading.fault ? 'mdi:alert-circle' : 'mdi:thermometer'} size={18} />
            </span>
            <span className='ohm-indoor_reading-text'>
              {title !== '' && <span dir='auto'>{title}</span>}
              {reading.fault && (
                <span>
                  {title !== '' && ' · '}
                  {tr('state.unavailable')}
                </span>
              )}
            </span>
          </span>
        )}
        {reading.humidity && (
          <span className='ohm-indoor_reading-humidity' data-fault={reading.humidity.fault || undefined}>
            <span className='ohm-indoor_reading-icon'>
              <Icon name={reading.humidity.fault ? 'mdi:alert-circle' : 'mdi:water'} size={18} />
            </span>
            <span className='ohm-indoor_reading-text'>{reading.humidity.text}</span>
          </span>
        )}
      </span>
    </div>
  );
}

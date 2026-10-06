/**
 * The Clock as a Widget (#50). The text is `ui/clock.ts`'s, still in Italian
 * until the strings module (#59) gives it the viewer's own formats.
 *
 * It grows with its box (its `css` in `index.ts`): a status-bar strip gets
 * Casa Panel's `clock` size, a big box a big time.
 */
import { clockText } from '../../ui/clock';
import { useNow } from '../../ui/useNow';
import type { WidgetProps } from '../types';
import type { clockSchema } from './schema';

export function ClockWidget({ widget }: WidgetProps<(typeof clockSchema)['settings']>) {
  const { time, date } = clockText(useNow());
  return (
    <div className='ohm-clock'>
      <time className='ohm-clock-time'>{time}</time>
      {widget.variant === 'full' && <span className='ohm-clock-date'>{date}</span>}
    </div>
  );
}

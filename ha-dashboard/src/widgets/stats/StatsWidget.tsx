/**
 * The stats Widget (#53): `ui/Stats`'s two StatCards, side by side, or one
 * over the other in a narrow box.
 *
 * The lights card's icon takes `accent` while any light is on: colour is
 * state (ADR-0013), and that is this state. An Unavailable power sensor is
 * said, in `alert`, never hidden; it is a Fault, so the Fault chip counts
 * it too.
 */
import { useEntityState } from '../../ha';
import { fmt, tr } from '../../i18n';
import { concernAt } from '../../ha/verdict';
import { useConcerns } from '../../renderer/concerns';
import { Icon } from '../../ui/Icon';
import type { WidgetProps } from '../types';
import type { statsSchema } from './schema';

export function StatsWidget({ settings }: WidgetProps<(typeof statsSchema)['settings']>) {
  const lightsOn = concernAt(useConcerns(), 'lit')?.entities.length ?? 0;
  const power = useEntityState(settings.power);
  const watts = power && !power.unavailable ? Number(power.state) : null;
  const unit = typeof power?.attributes.unit_of_measurement === 'string' ? power.attributes.unit_of_measurement : 'W';

  return (
    <div className='ohm-stats'>
      <StatCard
        icon='mdi:lightbulb'
        value={fmt.number(lightsOn)}
        unit={tr('stats.lightsOn', { count: lightsOn })}
        tone={lightsOn > 0 ? 'on' : 'off'}
      />
      {power &&
        (watts === null || Number.isNaN(watts) ? (
          <StatCard icon='mdi:flash' value={tr('stats.unavailable')} tone='alert' />
        ) : (
          <StatCard icon='mdi:flash' value={formatNumber(watts)} unit={tr('stats.power', { unit })} tone='off' />
        ))}
    </div>
  );
}

/** A reading as people say it: whole watts, no decimals a meter's jitter would make dance. */
const formatNumber = (n: number) => fmt.number(Math.round(n));

/** Casa Panel's StatCard (`cp-stat`). */
function StatCard({ icon, value, unit, tone }: { icon: string; value: string; unit?: string; tone: 'on' | 'off' | 'alert' }) {
  return (
    <div className='ohm-stats-card' data-tone={tone}>
      <span className='ohm-stats-icon'>
        <Icon name={tone === 'alert' ? 'mdi:alert-circle' : icon} size={22} />
      </span>
      <span className='ohm-stats-line'>
        <span className='ohm-stats-value'>{value}</span>
        {unit && <span className='ohm-stats-unit'>{unit}</span>}
      </span>
    </div>
  );
}

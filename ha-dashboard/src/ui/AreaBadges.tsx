/**
 * What else is going on in an Area, under its light control (#8).
 *
 * The room tiles grew from 180 to 227 px when the grid was resized to fill
 * the panel, which left an empty band between a tile's title and its slider.
 * This fills it with the things the panel could not say anywhere else: a door
 * standing open, motion, what the thermostat is doing, whether something is
 * playing.
 *
 * Entirely Derived (CONTEXT.md): each badge is a question about Domain and
 * device_class, never about an entity id, so a door sensor added in Home
 * Assistant shows up here on its own. Badges appear only when they have
 * something to say -- a quiet room shows none, and the tile stays quiet.
 */
import type { Area, Entity } from '../ha';
import { Icon } from './Icon';
import { stateLabel } from './stateLabel';
import { t } from './theme';

export type AreaBadgesProps = {
  area: Area;
  /** Text colour of the tile this sits in, so badges inherit its contrast. */
  color: string;
};

type Badge = { icon: string; text: string; alert?: boolean };

const OPENING_CLASSES = new Set(['door', 'window', 'garage', 'opening']);

/**
 * The badges an Area earns, worst first.
 *
 * Deliberately capped at three: this is a glance, and a tile that lists
 * everything stops being readable at 2 m.
 */
function badgesFor(area: Area): Badge[] {
  const out: Badge[] = [];
  const has = (fn: (e: Entity) => boolean) => area.entities.filter(fn);

  // A fault in this room outranks anything else it could say.
  const faults = has(e => e.unavailable && e.domain !== 'button' && e.domain !== 'update' && e.domain !== 'event');
  if (faults.length > 0) out.push({ icon: 'mdi:alert-circle', text: `${faults.length} non disp.`, alert: true });

  const open = has(e => e.domain === 'binary_sensor' && OPENING_CLASSES.has(e.attributes.device_class as string) && e.state === 'on');
  if (open.length > 0) out.push({ icon: 'mdi:door-open', text: open.length === 1 ? open[0].name : `${open.length} aperti`, alert: true });

  const motion = has(e => e.domain === 'binary_sensor' && e.attributes.device_class === 'motion' && e.state === 'on');
  if (motion.length > 0) out.push({ icon: 'mdi:motion-sensor', text: 'Movimento' });

  const climate = has(e => e.domain === 'climate' && e.state !== 'off' && !e.unavailable)[0];
  if (climate) out.push({ icon: 'mdi:thermostat', text: stateLabel(climate) });

  const playing = has(e => e.domain === 'media_player' && e.state === 'playing')[0];
  if (playing) out.push({ icon: 'mdi:music', text: playing.name });

  const vacuum = has(e => e.domain === 'vacuum' && e.state === 'cleaning')[0];
  if (vacuum) out.push({ icon: 'mdi:robot-vacuum', text: stateLabel(vacuum) });

  return out.slice(0, 3);
}

export function AreaBadges({ area, color }: AreaBadgesProps) {
  const badges = badgesFor(area);
  if (badges.length === 0) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: t.space.xs, minWidth: 0 }}>
      {badges.map(b => (
        <div
          key={b.icon + b.text}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: t.space.xs,
            color: b.alert ? t.color.fault : color,
            opacity: b.alert ? 1 : 0.8,
            fontSize: t.font.caption,
            minWidth: 0,
          }}
        >
          <Icon name={b.icon} size={18} color={b.alert ? t.color.fault : color} />
          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.text}</span>
        </div>
      ))}
    </div>
  );
}

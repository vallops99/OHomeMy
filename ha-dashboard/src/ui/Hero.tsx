/**
 * The one number read on approach from 2 m (CONTEXT.md's "read at 1-2 m").
 * Variant D called this "Arrivo calmo" (#6) and Casa Panel keeps it (#44):
 * no card, no border, no fill -- the temperature is just type sitting
 * directly on the ground, because a frame around it would be one more thing
 * to read before the number itself. That borderlessness is deliberate, not
 * an oversight -- do not wrap this in a Tile or give it a surface colour.
 *
 * It shows the **indoor** temperature, since the entrance panel's arrival
 * question is "is the house I'm walking into comfortable", not the weather
 * outside -- and since Casa Panel it says so, "Interno" over the number, as
 * the design's Casa screen does. Humidity follows under it.
 */
import { Icon } from './Icon';
import { pressable } from './pressable';
import { t } from './theme';

export type HeroProps = {
  /** Degrees Celsius from a `climate` entity, or null when none reports one. */
  temperature: number | null;
  humidity: number | null;
  /**
   * Opens the Page where the `climate` feeding the temperature is Placed
   * (#32); absent when there is none, and then the Hero is not a control.
   * No chevron either way: there is no room for one, and none is needed on
   * the number everyone reads first.
   */
  onOpen?: () => void;
};

export function Hero({ temperature, humidity, onOpen }: HeroProps) {
  const { lineHeight, weight, letterSpacing } = t.type.tempHero;
  const press = pressable(onOpen);
  return (
    <div {...press} style={{ display: 'flex', flexDirection: 'column', gap: t.space[1], ...press.style }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: t.space[2], fontSize: t.type.body.size, color: t.color.inkMuted }}>
        <Icon name='mdi:thermometer' size={18} />
        Interno
      </div>
      <div
        style={{
          // `font.hero`, not `tempHero.size`: 144 on the wall, and a phone's
          // own size at arm's length (ADR-0011), which the type style has not.
          fontSize: t.font.hero,
          fontWeight: weight,
          // Casa Panel's `1`. The box then reports 21 px of `scrollHeight`
          // over its 144, which is the font's content area (ascent plus
          // descent), not paint: the glyphs of a temperature sit at least
          // 18 px inside the box at both edges. ADR-0007's amendment records
          // why that, and not `scrollHeight`, is the property, and
          // `scripts/measure-panel.ts` asserts it. No negative margins: they
          // once made this box smaller than its glyphs (ADR-0007).
          lineHeight,
          letterSpacing,
          // The design's optical correction, -6 at 144 px: a big "2" carries
          // its own side bearing, which would set it in from "Interno".
          marginLeft: -Math.round(t.font.hero / 24),
          color: t.color.ink,
        }}
      >
        {temperature != null ? Math.round(temperature) : '--'}°
      </div>
      {/* The line disappears entirely when nothing reports a humidity. */}
      {humidity != null && (
        <div style={{ display: 'flex', alignItems: 'center', gap: t.space[2], fontSize: 18, color: t.color.inkSecondary }}>
          <span style={{ display: 'flex', color: t.color.inkMuted }}>
            <Icon name='mdi:water' size={18} />
          </span>
          {Math.round(humidity)}% umidità
        </div>
      )}
    </div>
  );
}

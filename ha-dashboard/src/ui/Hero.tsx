/**
 * The one number read on approach from 2 m (CONTEXT.md's "read at 1-2 m";
 * ADR-0001's 112 px hero). Variant D calls this "Arrivo, calmo" (#6): no
 * card, no border, no fill -- the temperature is just type sitting directly
 * on the ground, because a frame around it would be one more thing to read
 * before the number itself. That borderlessness is deliberate, not an
 * oversight -- do not wrap this in a Tile or give it a surface colour.
 *
 * Variant D's original prototype showed the outdoor reading here. This
 * restores it showing **indoor** instead (`interno`), since the entrance
 * panel's arrival question is "is the house I'm walking into comfortable",
 * not the weather outside.
 */
import { t } from './theme';

export type HeroProps = {
  /** Degrees Celsius from a `climate` entity, or null when none reports one. */
  temperature: number | null;
  humidity: number | null;
};

export function Hero({ temperature, humidity }: HeroProps) {
  return (
    <div>
      <div
        style={{
          fontSize: t.font.hero,
          fontWeight: 200,
          lineHeight: 0.92,
          letterSpacing: -3,
          color: t.color.textPrimary,
        }}
      >
        {temperature != null ? Math.round(temperature) : '--'}°
      </div>
      {/*
        No "interno" label: the entrance panel's hero is the house's own
        temperature, and saying so is stating the obvious in the largest
        type on the screen. Humidity stands alone, and the line disappears
        entirely when nothing reports one.
      */}
      {humidity != null && (
        <div style={{ fontSize: t.font.glanceM, color: t.color.textSecondary, marginTop: t.space.sm }}>
          {Math.round(humidity)}% umidità
        </div>
      )}
    </div>
  );
}

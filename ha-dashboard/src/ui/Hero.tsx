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
  return (
    <div {...pressable(onOpen)}>
      <div
        style={{
          fontSize: t.font.hero,
          fontWeight: 200,
          // `1.15`, and nothing else. Below about 1.13 this box reports
          // `scrollHeight` greater than `clientHeight` at 112 px / weight 200
          // in the system-ui stack -- measured in 0.01 steps: 0.92 -> 13 px
          // over, 1.0 -> 9, 1.1 -> 3, 1.13 -> 1, 1.15 -> 0. It does so with
          // "21" alone, no degree sign, so it is the font's own line box, not
          // a glyph problem.
          //
          // An earlier version kept 1.15 and pulled the extra 26 px back off
          // with `marginTop/Bottom: -13`, on the reasoning that the reserve
          // was empty space -- "blank font metrics costing the panel a real
          // scrollbar". That reasoning was wrong, and ADR-0007 records how it
          // was caught: a `Range` over this element's own text measures
          // **130 px of ink in a 128.8 px box**, flush at both edges (1 px
          // above, 0.2 px below). There is no empty reserve. The negative
          // margins were not reclaiming dead space, they were making this
          // element *claim* 103 px while painting 129 -- so 26 px of the
          // number rendered outside its own box and over whatever sat next to
          // it. At 1280x768 that was `Stats`, sliced horizontally by the gate
          // slab below it, which is the defect ADR-0007 exists to fix.
          //
          // The honest box is what the layout is now measured against
          // (`scripts/measure-panel.ts`), and the 26 px it costs is paid out
          // of `t.layout.gateSlab` rather than by lying about this element's
          // height. `fontSize` is untouched: "Arrivo calmo" (ADR-0001, #6)
          // reads exactly as large as it always did.
          lineHeight: 1.15,
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
        <div style={{ fontSize: t.font.glanceM, color: t.color.textSecondary, marginTop: t.space.sm }}>{Math.round(humidity)}% umidità</div>
      )}
    </div>
  );
}

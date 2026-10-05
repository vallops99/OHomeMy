---
status: accepted
---

# Casa Panel replaces the computed palette

The panel now follows the **Casa Panel** design system
([claude.ai artifact](https://claude.ai/artifact/6pny6UQqQvA5DpFNob8CHN)):
fixed tokens with an amber `accent` that means only "on", a coral `alert`
that means only "needs you", near-black neutrals, and Geist. This
supersedes [ADR-0001](0001-design-system.md), which derived every token from
a handful of `KNOBS` around a dark green accent and computed its foregrounds.
The two cannot coexist: Casa Panel's colours carry meaning (colour is state),
and a palette that recomputes itself from one knob cannot keep that promise.

`src/theme/tokens.ts` is ported from the system's `tokens.json` and exposed as
CSS custom properties; the design system is the source of truth, and a token
change is made there first. ADR-0001's contrast findings are kept as checks
against the new values, not as code: text 4.5:1 on its ground, 3:1 for
filled controls and icons, both measured rather than assumed.

## Two choices that come with it

- **Icons are Lucide, not MDI.** Casa Panel draws line icons with no fills,
  from a closed set of about 26. Home Assistant hands the panel any `mdi:`
  name an Area or Page Opener carries, so the closed set cannot cover it, and
  MDI's filled glyphs clash with the system. Lucide is the same stroke style
  with a set large enough to map onto. One file maps MDI names to Lucide; an
  unmapped name gets a neutral line glyph, never a filled MDI one.
- **The components are ported, not loaded.** The system ships a classic-script
  React bundle on `window.Casa`. It cannot be type-checked and knows nothing
  of Unavailable or Fault, so its components are rewritten in `src/ui`
  against its READMEs and previews, keeping
  [ADR-0002](0002-component-layer.md)'s seam.

## Consequences

- ADR-0001's "adding a colour means adding a derivation" no longer holds:
  adding a colour means adding it to the design system.
- Retuning for real hardware, which ADR-0001 kept to one edit, is now an edit
  to the design system and a re-port of `tokens.json`.

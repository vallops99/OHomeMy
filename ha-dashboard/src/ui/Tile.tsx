/**
 * The base surface every tile is built on.
 *
 * This is the single place @hakit's `CardBase` is touched. We pass
 * `onlyFunctionality` so we inherit its behaviour -- long-press to open the
 * entity modal, ripples, press scaling -- while every pixel comes from our own
 * tokens. That is what makes "wrap everything" affordable: reimplementing the
 * long-press modal would have been the expensive part, and we do not have to.
 *
 * Replacing @hakit means rewriting this file's internals. Its props are ours.
 */
import { CardBase } from '@hakit/components';
import type { ReactNode } from 'react';
import type { Entity } from '../ha';
import { stateLabel } from './stateLabel';
import { lineFor, surfaceFor, v } from './vars';

export type TileProps = {
  /** The entity this tile stands for. Drives active/fault styling and the modal. */
  entity?: Entity | null;
  active?: boolean;
  /** A filled control: the accent fills it while it is on (ADR-0013). */
  strong?: boolean;
  /**
   * Fill the tile even when inactive. Gates are the panel's primary
   * affordance (CONTEXT.md) and must read as a control from 2 m whether open
   * or closed, so they do not fade into the inactive surface: off, the fill
   * is `primary`, and only on is it the accent (`surfaceFor`).
   */
  alwaysFilled?: boolean;
  /**
   * Lay the tile out as a single horizontal row (variant D's room list, #6).
   *
   * A named shape rather than something a caller imposes with inline styles:
   * the surface styling below is an emotion class, which beats an inline
   * `display`, so a caller passing `display: flex` in `style` would silently
   * get a block and stack its children. Anything the tile must be, it must
   * be able to say here.
   */
  row?: boolean;
  onClick?: () => void;
  /** Suppress the long-press modal, for tiles that own their whole surface. */
  disableModal?: boolean;
  children?: ReactNode;
  style?: React.CSSProperties;
};

export function Tile({ entity, active, strong, alwaysFilled, row, onClick, disableModal, children, style }: TileProps) {
  const unavailable = entity?.unavailable ?? false;

  const surface = {
    boxSizing: 'border-box' as const,
    border: `1px solid ${lineFor({ active, filled: alwaysFilled, unavailable, strong })}`,
    borderRadius: v.radius.tile,
    background: surfaceFor({ active, filled: alwaysFilled, unavailable, strong }),
    padding: v.space.md,
    overflow: 'hidden',
    minHeight: v.touch.primary,
  };

  // No entity: render the surface ourselves rather than handing @hakit a card.
  //
  // @hakit's `unknown` sentinel is documented as a no-op, but `CardBase`
  // still mounts its modal subtree, which throws on `null.state` and takes
  // the panel down through the error boundary -- `disableModal` does not
  // prevent the mount. Found by placing a `room` slot on an Area with no
  // light.
  //
  // What this branch loses with `CardBase` is the press *behaviour*: ripples,
  // press scaling, and the long-press modal. The modal is exactly what must
  // not mount here, and the rest is decoration -- but `onClick` is not
  // decoration, and an earlier version of this comment ("there is nothing to
  // press anyway") stopped being true the moment #14 gave the footer an
  // entity-less tappable block. An Area is not an entity, so `AreaOpenerBlock`
  // and `HomeBlock` land in this branch; dropping their `onClick` here made
  // both render as perfectly convincing buttons that did nothing at all when
  // tapped -- the precise "dead control that looks live" failure the footer's
  // own comments cite the deleted NavBar.tsx for. So the handler is wired to
  // the div, and the div is given the button semantics that come free with
  // `CardBase` on the other path: a role, keyboard operability, and a focus
  // ring, since a bare div with an onClick is invisible to a keyboard.
  if (!entity) {
    const pressable = onClick !== undefined && !unavailable;
    return (
      <div
        {...(pressable
          ? {
              role: 'button',
              tabIndex: 0,
              onClick: () => onClick(),
              onKeyDown: (e: React.KeyboardEvent) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onClick();
                }
              },
            }
          : {})}
        style={{
          ...surface,
          ...(row ? { display: 'flex', alignItems: 'center', gap: v.space.md, width: '100%' } : { display: 'block', width: '100%' }),
          ...(pressable ? { cursor: 'pointer' } : {}),
          ...style,
        }}
      >
        {children}
      </div>
    );
  }

  return (
    <CardBase
      // `unknown` is @hakit's documented no-op entity sentinel.
      entity={(entity?.id ?? 'unknown') as 'unknown'}
      onlyFunctionality
      // No entity means no modal: @hakit's `unknown` sentinel still opens one,
      // and its contents throw on `null.state`, taking the panel down with an
      // error boundary. Found by placing a `room` slot on an Area with no
      // light (Esterno) -- which ADR-0004 says not to do, but a screen that
      // does it should render a quiet row, not crash.
      disableModal={disableModal || unavailable || !entity}
      // @hakit title-cases the raw state for the modal's headline ("Locked")
      // instead of localising it. `stateTitle` wins over that, so the modal
      // says what the tile says. See src/ui/stateLabel.ts.
      modalProps={entity ? { stateTitle: stateLabel(entity) } : undefined}
      disableActiveState
      disableColumns
      onClick={() => onClick?.()}
      // No `height: 100%` on the card. That was right under the old grid,
      // where the cell defined the box, but in the panel's flex columns it
      // makes every tile claim the whole column -- the camera glance took
      // the entire sidebar and left the gates below it with nothing. A tile
      // is now as tall as its content, or as tall as the flex its caller
      // gives it, with `minHeight` keeping it a touch target.
      cssStyles={`
        display: ${row ? 'flex' : 'block'};
        ${row ? 'align-items: center;' : ''}
        width: 100%;
        max-height: ${v.layout.tileMaxH};
        ${
          // @hakit nests the children three levels down -- `.ripple-parent`,
          // `.ripple-inner`, then `.contents`, which is the element that
          // actually holds them and is `display: block`. Styling the card
          // alone leaves a row's contents stacked inside it. The nesting is
          // not in @hakit's types; it was found by walking the rendered DOM,
          // which is the only way to see it. If a future @hakit changes these
          // class names the row will stack again -- visibly, not silently.
          row
            ? `& .ripple-parent, & .ripple-inner {
          width: 100%;
          height: 100%;
        }
        & .contents {
          display: flex;
          align-items: center;
          gap: ${v.space.md};
          width: 100%;
          height: 100%;
        }`
            : ''
        }
        box-sizing: border-box;
        /*
         * @hakit clips the ripple to its own box, and that box is flush with
         * the tile's content edge -- so a glyph that bears left of its origin
         * (a capital N, an italic) is sliced down its left side. Letting the
         * ripple layers overflow puts the clip back on the card, which has a
         * radius and padding, instead of on the text.
         */
        & .ripple-parent, & .ripple-inner { overflow: visible !important; }
        border: 1px solid ${lineFor({ active, filled: alwaysFilled, unavailable, strong })};
        border-radius: ${v.radius.tile};
        background: ${surfaceFor({ active, filled: alwaysFilled, unavailable, strong })};
        padding: ${v.space.md};
        overflow: hidden;
        cursor: ${unavailable ? 'not-allowed' : 'pointer'};
      `}
      style={{
        // No grid spans: the panel's regions are flows, and the one part
        // that tiles (the bottom strip) places its children itself. A tile
        // fills whatever box it is given.
        minHeight: v.touch.primary,
        ...style,
      }}
    >
      {children}
    </CardBase>
  );
}

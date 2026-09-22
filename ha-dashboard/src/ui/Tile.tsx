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
import { surfaceFor, t } from './theme';

export type TileProps = {
  /** The entity this tile stands for. Drives active/fault styling and the modal. */
  entity?: Entity | null;
  active?: boolean;
  /** Use the lifted accent, for controls that must read as "on" at 2 m (ADR-0001). */
  strong?: boolean;
  /**
   * Fill the tile with the accent even when inactive. Gates are the panel's
   * primary affordance (CONTEXT.md) and must read as a control from 2 m
   * whether open or closed, so they do not fade into the inactive surface.
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
    border: `1px solid ${unavailable ? t.color.fault : t.color.border}`,
    borderRadius: t.radius.tile,
    background: surfaceFor({ active: active || alwaysFilled, unavailable, strong }),
    padding: t.space.md,
    overflow: 'hidden',
    minHeight: t.touch.primary,
  };

  // No entity: render the surface ourselves rather than handing @hakit a card.
  //
  // @hakit's `unknown` sentinel is documented as a no-op, but `CardBase`
  // still mounts its modal subtree, which throws on `null.state` and takes
  // the panel down through the error boundary -- `disableModal` does not
  // prevent the mount. There is nothing to press anyway, so the press
  // behaviour we would be keeping is behaviour for a control that does not
  // exist. Found by placing a `room` slot on an Area with no light.
  if (!entity) {
    return (
      <div
        style={{
          ...surface,
          ...(row ? { display: 'flex', alignItems: 'center', gap: t.space.md, width: '100%' } : { display: 'block', width: '100%' }),
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
      cssStyles={`
        display: ${row ? 'flex' : 'block'};
        ${row ? 'align-items: center;' : ''}
        width: 100%;
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
          gap: ${t.space.md}px;
          width: 100%;
          height: 100%;
        }`
            : ''
        }
        height: 100%;
        box-sizing: border-box;
        border: 1px solid ${unavailable ? t.color.fault : t.color.border};
        border-radius: ${t.radius.tile}px;
        background: ${surfaceFor({ active: active || alwaysFilled, unavailable, strong })};
        padding: ${t.space.md}px;
        overflow: hidden;
        cursor: ${unavailable ? 'not-allowed' : 'pointer'};
      `}
      style={{
        // No grid spans: the panel's regions are flows, and the one part
        // that tiles (the bottom strip) places its children itself. A tile
        // fills whatever box it is given.
        minHeight: t.touch.primary,
        ...style,
      }}
    >
      {children}
    </CardBase>
  );
}

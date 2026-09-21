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
  /** Columns and rows of the 4x2 grid this tile occupies (ADR-0001 grid). */
  colSpan?: number;
  rowSpan?: number;
  onClick?: () => void;
  /** Suppress the long-press modal, for tiles that own their whole surface. */
  disableModal?: boolean;
  children?: ReactNode;
  style?: React.CSSProperties;
};

export function Tile({
  entity,
  active,
  strong,
  alwaysFilled,
  colSpan = 1,
  rowSpan = 1,
  onClick,
  disableModal,
  children,
  style,
}: TileProps) {
  const unavailable = entity?.unavailable ?? false;

  return (
    <CardBase
      // `unknown` is @hakit's documented no-op entity sentinel.
      entity={(entity?.id ?? 'unknown') as 'unknown'}
      onlyFunctionality
      disableModal={disableModal || unavailable}
      // @hakit title-cases the raw state for the modal's headline ("Locked")
      // instead of localising it. `stateTitle` wins over that, so the modal
      // says what the tile says. See src/ui/stateLabel.ts.
      modalProps={entity ? { stateTitle: stateLabel(entity) } : undefined}
      disableActiveState
      disableColumns
      onClick={() => onClick?.()}
      cssStyles={`
        display: block;
        width: 100%;
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
        gridColumn: `span ${colSpan}`,
        gridRow: `span ${rowSpan}`,
        minHeight: t.touch.primary,
        ...style,
      }}
    >
      {children}
    </CardBase>
  );
}

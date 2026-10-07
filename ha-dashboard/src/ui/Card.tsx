/**
 * Casa Panel's grouping card (`cp-card`, #43): a surface holding rows, a
 * hairline between each two, and optionally a `SectionLabel` on top.
 *
 * What a Group is in `left` and `right` -- the helper's name as the title,
 * its members as the rows (ADR-0014) -- and what a lone gate sits in, so an
 * `AccessRow` always has its card around it.
 */
import { Children, Fragment, isValidElement, type CSSProperties, type ReactNode } from 'react';
import { t } from './theme';

export type CardProps = {
  /** The `SectionLabel`: a noun, set in capitals by the style. None for a lone row. */
  title?: string;
  children?: ReactNode;
  /** Overrides on the root box: a Widget sizes it to its own (`src/widgets`). */
  style?: CSSProperties;
};

export function Card({ title, children, style }: CardProps) {
  // `Children.toArray` drops the `null`s a dispatch may hand back, so a
  // divider never stands next to nothing.
  const rows = Children.toArray(children);
  return (
    <section
      aria-label={title}
      style={{
        flex: '0 0 auto',
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
        padding: `6px ${t.space[2]}px`,
        borderRadius: t.radius.tile,
        background: t.color.surface,
        border: `1px solid ${t.color.line}`,
        ...style,
      }}
    >
      {title !== undefined && <SectionLabel>{title}</SectionLabel>}
      {rows.map((row, i) => (
        <Fragment key={isValidElement(row) && row.key !== null ? row.key : i}>
          {i > 0 && <div style={{ height: 1, background: t.color.line, margin: '0 10px', flexShrink: 0 }} />}
          {row}
        </Fragment>
      ))}
    </section>
  );
}

/** Casa Panel's `SectionLabel` inside a card: 14 px, 500, tracked, capitals, muted. */
function SectionLabel({ children }: { children: ReactNode }) {
  const { size, lineHeight, weight, letterSpacing } = t.type.label;
  return (
    <div
      // A title someone wrote, in its own direction (#59).
      dir='auto'
      style={{
        padding: '12px 12px 4px',
        fontSize: size,
        lineHeight,
        fontWeight: weight,
        letterSpacing,
        textTransform: 'uppercase',
        color: t.color.inkMuted,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}
    >
      {children}
    </div>
  );
}

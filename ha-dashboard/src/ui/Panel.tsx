/**
 * The panel: two regions side by side (variant D, #6).
 *
 * The entrance panel is not one grid. It has two jobs with different
 * rhythms, so it has two columns rather than a set of rows sized against
 * each other:
 *
 *   sidebar  420 px, fixed  the glance layer -- read on approach from 2 m
 *   main     the remainder  the touched layer -- one row per Area
 *
 * Both regions flow vertically and size their contents intrinsically. The
 * earlier 4x4 grid (#8) computed four unequal rows that summed to 800 px
 * exactly; this layout gives that property up deliberately, so fit is a
 * thing to measure rather than a thing to add up. See the amendment on
 * ADR-0004.
 */
import type { ReactNode } from 'react';
import { t } from './theme';

export type PanelProps = {
  sidebar: ReactNode;
  main: ReactNode;
};

export function Panel({ sidebar, main }: PanelProps) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `${t.layout.sidebarW}px 1fr`,
        gap: t.space.lg,
        padding: t.space.lg,
        width: '100%',
        height: '100vh',
        boxSizing: 'border-box',
        background: t.color.ground,
        // The panel is a fixed 1280x800 pane on a wall, so nothing scrolls in
        // the designed case. `auto` rather than `hidden` because a viewport
        // shorter than the content is a real condition -- below about 744 px
        // the second gate does not fit -- and a control silently cut off the
        // bottom edge is exactly the kind of invisible failure this panel is
        // supposed to avoid. A scrollbar says so; clipping does not.
        overflow: 'auto',
      }}
    >
      {/*
        The arrival column. `minHeight: 0` lets the flex children shrink
        rather than overflow the viewport: a sidebar that grows past 800 px
        would push the gates off the bottom of a panel that cannot scroll.
      */}
      <aside style={{ display: 'flex', flexDirection: 'column', gap: t.space.md, minHeight: 0 }}>{sidebar}</aside>

      {/*
        The touched column. Room rows stack from the top; anything the screen
        places after them (the bottom strip) is pushed down by the spacer the
        screen itself supplies, so the strip sits on the floor of the panel
        however many Areas the house has.
      */}
      {/*
        The touched column. Room rows share the space above the strip
        equally: `flex: 1` on each row rather than a fixed height, so the
        list fills the panel exactly however many Areas the house has, and
        adding a sixth shrinks the rows instead of pushing the strip off a
        panel that cannot scroll. `t.layout.rowRoom` is the floor -- below it
        the row is no longer glanceable, so the panel would rather overflow
        visibly than render rows nobody can read from 2 m.
      */}
      <main
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: t.space.sm,
          minHeight: 0,
          overflow: 'hidden',
        }}
      >
        {main}
      </main>
    </div>
  );
}

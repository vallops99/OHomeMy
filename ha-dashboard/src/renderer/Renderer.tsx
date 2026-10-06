/**
 * The document-driven renderer (ADR-0015, #50): one Dashboard, read through
 * `ohomemy/document/subscribe` and redrawn on every Publish, in its frame,
 * opening on its Home Page (`DashboardView.tsx`, #54).
 *
 * Inside Home Assistant the panel's `config.dashboard_id` names the
 * Dashboard; on the dev server `?dashboard=<slug>` does (`select.ts`).
 *
 * Four `<style>`s go in with it, and so into the shadow root: the theme's
 * custom properties, the grid's and the frame's stylesheets and every Widget
 * kind's own. They
 * are plain elements in the tree, which React 19 leaves in place (it hoists
 * only a `<style>` given `href` and `precedence`), so they move with the tree
 * on each remount.
 */
import { useState, type ReactNode } from 'react';
import type { Id } from '../document/types';
import { usePublished } from '../ha';
import { usePanelProps } from '../panel/panelProps';
import { DEFAULT_THEME, themeCss } from '../theme/themes';
import { WIDGETS_CSS } from '../widgets/registry';
import { DashboardView } from './DashboardView';
import { FRAME_CSS } from './Frame';
import { RENDERER_CSS } from './grid';
import type { Nav } from './navigation';
import { dashboardRef, selectHomePage } from './select';

/**
 * What the renderer says when there is nothing to draw: quietly, in the
 * middle of the screen, and only what is true. English until the strings
 * module (#59).
 */
const NOTICES = {
  none: {
    title: 'No Dashboards yet',
    detail: 'An admin can build one in OHomeMy Builder.',
  },
  missing: {
    title: 'This Dashboard is not there any more',
    detail: 'It may have been deleted in OHomeMy Builder. Another Dashboard can be opened from the sidebar.',
  },
  empty: {
    title: 'Nothing on this Page yet',
    detail: 'Widgets placed on it in OHomeMy Builder appear here as soon as they are published.',
  },
};

export function Renderer() {
  const published = usePublished();
  const { panel } = usePanelProps();
  // Where each Dashboard was left, for coming back to its panel.
  const [places] = useState(() => new Map<Id, Nav>());

  // Nothing at all until the first answer, rather than a notice that is
  // about to be wrong.
  if (!published) return null;

  const selection = selectHomePage(published.document, dashboardRef(panel?.config, window.location.search));
  const theme = selection.state === 'page' ? selection.dashboard.settings.theme : { name: DEFAULT_THEME, mode: 'auto' as const };

  let body: ReactNode;
  if (selection.state !== 'page') body = <Notice {...NOTICES[selection.state]} />;
  else
    body = (
      <DashboardView key={selection.dashboard.id} dashboard={selection.dashboard} places={places} empty={<Notice {...NOTICES.empty} />} />
    );

  return (
    <>
      <style>{themeCss(theme.name, theme.mode)}</style>
      <style>{RENDERER_CSS}</style>
      <style>{FRAME_CSS}</style>
      <style>{WIDGETS_CSS}</style>
      <div className='ohm-dashboard'>{body}</div>
    </>
  );
}

function Notice({ title, detail }: { title: string; detail: string }) {
  return (
    <div className='ohm-notice' role='status'>
      <span className='ohm-notice-title'>{title}</span>
      <span className='ohm-notice-detail'>{detail}</span>
    </div>
  );
}

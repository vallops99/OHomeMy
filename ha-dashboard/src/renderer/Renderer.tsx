/**
 * The document-driven renderer (ADR-0015, #50): one Dashboard, read through
 * `ohomemy/document/subscribe` and redrawn on every Publish, in its frame,
 * opening on its Home Page (`DashboardView.tsx`, #54). Over it, the Popup
 * layer shows whichever Popup Home Assistant has open, if this Dashboard
 * lays it out (`PopupLayer.tsx`, #58).
 *
 * Inside Home Assistant the panel's `config.dashboard_id` names the
 * Dashboard; on the dev server `?dashboard=<slug>` does (`select.ts`).
 *
 * Four `<style>`s go in with it, and so into the shadow root: the theme's
 * custom properties, the grid's and the frame's stylesheets, every Widget
 * kind's own and the Popup layer's. They are plain elements in the tree,
 * which React 19 leaves in place (it hoists only a `<style>` given `href`
 * and `precedence`), so they move with the tree on each remount.
 */
import { useState, type ReactNode } from 'react';
import type { Id } from '../document/types';
import { usePublished } from '../ha';
import { tr } from '../i18n';
import { useLocalised } from '../i18n/useLocalised';
import { usePanelProps } from '../panel/panelProps';
import { DEFAULT_THEME, themeCss } from '../theme/themes';
import { WIDGETS_CSS, widgetKind } from '../widgets/registry';
import { DashboardConcerns } from './concerns';
import { DashboardView } from './DashboardView';
import { FRAME_CSS } from './Frame';
import { RENDERER_CSS } from './grid';
import type { Nav } from './navigation';
import { POPUP_CSS, PopupLayer } from './PopupLayer';
import { dashboardRef, selectHomePage } from './select';

/**
 * What the renderer says when there is nothing to draw: quietly, in the
 * middle of the screen, and only what is true.
 */
const NOTICES = {
  none: () => ({ title: tr('renderer.none.title'), detail: tr('renderer.none.detail') }),
  missing: () => ({ title: tr('renderer.missing.title'), detail: tr('renderer.missing.detail') }),
  empty: () => ({ title: tr('renderer.empty.title'), detail: tr('renderer.empty.detail') }),
};

export function Renderer() {
  // First, so every word below is the viewer's (#59).
  const localised = useLocalised();
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
  if (selection.state !== 'page') body = <Notice {...NOTICES[selection.state]()} />;
  else
    body = (
      // Concerns are the whole Dashboard's, on any of its Pages (#53). The
      // Popup layer goes inside the Dashboard's navigation, so a Widget on a
      // Popup opens a Page underneath.
      <DashboardConcerns dashboard={selection.dashboard} schemaOf={schemaOf}>
        <DashboardView
          key={selection.dashboard.id}
          dashboard={selection.dashboard}
          places={places}
          empty={<Notice {...NOTICES.empty()} />}
          overlay={<PopupLayer dashboard={selection.dashboard} />}
        />
      </DashboardConcerns>
    );

  return (
    <>
      <style>{themeCss(theme.name, theme.mode)}</style>
      <style>{RENDERER_CSS}</style>
      <style>{FRAME_CSS}</style>
      <style>{WIDGETS_CSS}</style>
      <style>{POPUP_CSS}</style>
      <div className='ohm-dashboard' lang={localised.lang} dir={localised.dir} style={localised.style}>
        {body}
      </div>
    </>
  );
}

const schemaOf = (kind: string) => widgetKind(kind)?.schema;

function Notice({ title, detail }: { title: string; detail: string }) {
  return (
    <div className='ohm-notice' role='status'>
      <span className='ohm-notice-title'>{title}</span>
      <span className='ohm-notice-detail'>{detail}</span>
    </div>
  );
}

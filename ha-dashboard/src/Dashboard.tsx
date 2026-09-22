/**
 * The panel, rendered from Home Assistant's labels alone (#13, ADR-0005).
 *
 * There is no screen definition any more. `usePage` resolves `page:main` --
 * the home screen by convention (docs/protocol.md) -- into the four Regions'
 * ordered contents, and `PlacementView` turns each Region's contents into
 * the components its Rendering contract calls for. Moving a Row between
 * Regions is editing a Label in Home Assistant's UI; nothing here changes
 * and nothing is rebuilt.
 *
 * The Page name is the one piece of layout still written in code, and it is
 * a convention rather than a decision: `page:main` is what the panel shows
 * at rest. Every other Page is reached from the footer, which is #14's
 * router.
 */
import { usePage, useEntityState } from './ha';
import { Panel, PlacementView } from './ui';

/**
 * The helper that gates the `glance` quadrant (docs/protocol.md). A Home
 * Assistant `input_boolean`, so the quadrant can be turned off from a phone
 * without rebuilding the frontend -- the one part of the panel's shape that
 * is not decided by Placement Labels.
 *
 * Named here rather than Derived from a Label because it is a fact about the
 * panel, not about the house: there is nothing in the registries that would
 * identify "the toggle that gates the glance region" without naming it.
 */
const GLANCE_TOGGLE = 'input_boolean.panel_glance';

function Dashboard() {
  const page = usePage('main');
  const toggle = useEntityState(GLANCE_TOGGLE);

  // Absent from the registry entirely means the helper has not been created
  // (fake-house/scripts/apply-registry.py creates it), and the glance layer
  // is shown -- the panel's designed shape. Only an explicit `off` collapses
  // it, so a missing helper never silently costs the house its glance.
  const glanceOn = toggle === null || toggle.state !== 'off';

  return (
    <Panel
      glance={glanceOn ? <PlacementView region='glance' placed={page.glance} /> : undefined}
      entitiesLeft={<PlacementView region='entities-left' placed={page['entities-left']} />}
      entitiesRight={<PlacementView region='entities-right' placed={page['entities-right']} />}
      footer={<PlacementView region='footer' placed={page.footer} />}
    />
  );
}

export default Dashboard;

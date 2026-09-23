/**
 * The panel, rendered from Home Assistant's labels alone (#13, ADR-0005),
 * plus the one piece of state that is not a Label at all: which Page is
 * currently open (#14).
 *
 * `usePage` resolves a Page name into the four Regions' ordered contents,
 * and `PlacementView` turns each Region's contents into the components its
 * Rendering contract calls for. Moving a Row between Regions is editing a
 * Label in Home Assistant's UI; nothing here changes and nothing is
 * rebuilt. What Home Assistant's registries cannot supply is *which* Page
 * is open right now -- that is not a fact about the house, it is a fact
 * about this panel, in this browser tab, at this moment -- so it lives here,
 * as ordinary React state, per #14's decision 1: no router library, no
 * `history`, no hash. The panel is a Fully Kiosk pane with no address bar
 * and nobody types, so a URL would buy back/forward and deep links that
 * nothing on this hardware could ever use; state buys nothing to configure
 * and no history to get wrong.
 *
 * `Dashboard` owns that state, rather than a hook or context defined
 * elsewhere owning it and `Dashboard` merely consuming it, for the same
 * reason it already owned `usePage('main')`: this is the one component that
 * composes all four Regions and the `Panel` shell around them, so it is the
 * natural place to decide *which* Page's Regions are being composed this
 * render. `NavigationContext` (`src/ui/NavigationContext.tsx`) carries that
 * decision down to the two footer blocks that need to change it
 * (`AreaOpenerBlock`, `HomeBlock`) without threading an `openPage` prop
 * through `PlacementView`'s every Region branch -- see that file's header
 * comment for the full reasoning on why a context and not prop-threading.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { usePage, useEntityState } from './ha';
import { EmptyPageMessage, NavigationProvider, Panel, PlacementView } from './ui';

/** The Page the panel opens on, and the one Page the idle timer below never fires on. */
const MAIN_PAGE = 'main';

/**
 * Idle return, in milliseconds (#14, decision 4). After this long with no
 * interaction on a non-main Page, the panel returns to `page:main` on its
 * own.
 *
 * The panel sits at the entrance and its resting state is the house's
 * Verdict (CONTEXT.md); whoever walks up to it next should not find someone
 * else's Area page left open by whoever was last standing here. #2 already
 * established that the panel cannot sense someone *approaching* -- wake is
 * Fully Kiosk's own camera motion, not a Home Assistant entity this code can
 * read -- but it can sense time, which is the only signal left for "this
 * page has been abandoned".
 *
 * 240s and not something shorter: long enough that reading a Page (checking
 * a camera, watching a chip list, adjusting something on an Area's own page)
 * is never interrupted mid-use by a panel that yanks itself home -- a timer
 * that fires while someone is still looking is worse than no timer, because
 * it teaches people to distrust the panel. Long enough, too, that a `1s`
 * flip through this constant's history would find no reason to distinguish
 * "reading" from "walked away" at a shorter interval without real usage data
 * to measure against, which #14 does not have. Short enough that the panel
 * is reliably home by the time the *next* person reaches it, rather than
 * still showing whatever the last visitor opened. 240s is the number that
 * satisfies both without evidence to tune it more precisely; revisit with
 * real usage data if it turns out to be wrong in either direction.
 */
const IDLE_RETURN_MS = 240_000;

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
  const [currentPage, setCurrentPage] = useState(MAIN_PAGE);
  const page = usePage(currentPage);
  const toggle = useEntityState(GLANCE_TOGGLE);

  // Absent from the registry entirely means the helper has not been created
  // (fake-house/scripts/apply-registry.py creates it), and the glance layer
  // is shown -- the panel's designed shape. Only an explicit `off` collapses
  // it, so a missing helper never silently costs the house its glance.
  const glanceOn = toggle === null || toggle.state !== 'off';

  // The *second*, independent way the quadrant collapses (#14, decision 3;
  // docs/protocol.md, "The glance region collapses -- two ways"): `glance`
  // resolves per Page like every other Region, so a Page with nothing Placed
  // in it has no glance quadrant at all and `entities-right` takes the
  // panel's width.
  //
  // This has to be decided here rather than inside `GlanceView`, because
  // `GlanceView` cannot render *nothing*: `Hero`, `Stats` and `ChipRow` take
  // computed whole-house values (the lights-on count, the Verdict, the
  // ambient power reading) that exist whether or not anything is Placed on
  // this Page. Handing it an empty `Placed[]` therefore does not produce an
  // empty column -- it produces a column of house-wide leftovers with a
  // temperature-less `--` hero, which is exactly what appeared on
  // `page:corridoio` and what this check exists to prevent. Emptiness is a
  // fact about the Page's Placement, so `Panel` must be told to drop the
  // whole left column, which is the shape `glance={undefined}` already means.
  const glancePlaced = page.glance.length > 0;

  // `openPage` is the only way anything below this component can change
  // `currentPage` -- see NavigationContext.tsx. Wrapped in `useCallback` so
  // the context value below does not change identity on every render, which
  // would otherwise force every consumer (every footer block, on every
  // Page) to re-render on every Dashboard render rather than only when the
  // Page actually changes.
  const openPage = useCallback((next: string) => setCurrentPage(next), []);

  // Idle return (#14, decision 4). A ref, not state, for `lastActivity`:
  // recording *when* something last happened is bookkeeping for a timer
  // callback, not a value this component renders against, so putting it in
  // state would trigger a render on every interaction for no visible effect.
  // Seeded at `0` rather than `Date.now()` -- reading the clock is an impure
  // call oxlint's `react(purity)` rule rightly rejects during render -- and
  // set to the real time immediately below, in the effect, before anything
  // could read it.
  const lastActivityRef = useRef(0);

  useEffect(() => {
    lastActivityRef.current = Date.now();

    // `page:main` has no idle timer at all (decision 4): it is already
    // where the panel returns *to*, so a timer here would have nothing to
    // do and no reason to exist.
    if (currentPage === MAIN_PAGE) return;

    // Polled rather than one `setTimeout` reset per interaction: the panel
    // is a touch surface with no discrete "interaction" event this codebase
    // already listens for in one place (taps land on many different
    // components, each with their own `onClick`), so a single capturing
    // listener at the document root plus a short poll is simpler and more
    // robust than instrumenting every tappable component to reset a timer
    // it does not otherwise need to know about. The poll only ever compares
    // a timestamp and, at most once per tick, calls `setCurrentPage`, so its
    // cost is negligible against a 5 s interval.
    const onActivity = () => {
      lastActivityRef.current = Date.now();
    };
    document.addEventListener('pointerdown', onActivity);
    document.addEventListener('keydown', onActivity);

    const POLL_MS = 5_000;
    const interval = setInterval(() => {
      if (Date.now() - lastActivityRef.current >= IDLE_RETURN_MS) {
        setCurrentPage(MAIN_PAGE);
      }
    }, POLL_MS);

    // Cleanup runs both on unmount and whenever `currentPage` changes
    // (React tears down and re-runs an effect whose dependencies changed) --
    // which is exactly what stops a leaked interval from an earlier Page
    // firing `setCurrentPage(MAIN_PAGE)` after navigation has already moved
    // on. Without this, navigating main -> corridoio -> salone within one
    // idle window would leave *two* stale timers armed, either of which
    // could yank the panel back to main mid-visit on `salone` for a reason
    // that has nothing to do with how long `salone` itself has been idle.
    return () => {
      document.removeEventListener('pointerdown', onActivity);
      document.removeEventListener('keydown', onActivity);
      clearInterval(interval);
    };
  }, [currentPage]);

  // Well-formed Placement, nothing Placed (#14, decision 6): every Region
  // resolved cleanly and all four came back empty. Not the same condition as
  // `region:top-left`/a doubled Label -- see `EmptyPageMessage`'s own
  // comment for why this is deliberately not routed through
  // docs/protocol.md's "malformed placement renders nothing" rule.
  const isEmpty = Object.values(page).every(placed => placed.length === 0);

  return (
    <NavigationProvider value={{ page: currentPage, openPage }}>
      <Panel
        glance={glanceOn && glancePlaced ? <PlacementView region='glance' placed={page.glance} /> : undefined}
        entitiesLeft={<PlacementView region='entities-left' placed={page['entities-left']} />}
        entitiesRight={isEmpty ? <EmptyPageMessage /> : <PlacementView region='entities-right' placed={page['entities-right']} />}
        // The footer is never swapped for the empty-Page message, even when
        // `isEmpty` is true: `PlacementView` already renders the `HomeBlock`
        // for any non-main Page regardless of what is Placed in `footer`
        // (it is not Placed itself, see PlacementView.tsx), so the way home
        // survives exactly the situation decision 6 exists to guard against.
        footer={<PlacementView region='footer' placed={page.footer} />}
      />
    </NavigationProvider>
  );
}

export default Dashboard;

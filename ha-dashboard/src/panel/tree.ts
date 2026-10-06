/**
 * The DOM a Dashboard renders into, made once per page.
 *
 * Home Assistant destroys the panel element on navigating away and makes a
 * new one on coming back. The Dashboard does not go with it: @hakit's
 * HassConnect cannot connect a second time in the same page (its module-level
 * `attemptedUrls` is never cleared, docs/research/hakit-in-a-panel.md), so a
 * fresh React root would sit on the loader for good. Instead this tree, with
 * the React root inside it, lives for the whole page, and each new element
 * moves it into its own shadow root.
 *
 * It is created here, in a module with no imports, because the emotion
 * caches need `styles` while @hakit's modules are still being evaluated --
 * before `main.tsx`'s own code runs.
 */
const div = (style = '') => {
  const node = document.createElement('div');
  node.style.cssText = style;
  return node;
};

/** What moves between shadow roots; lays nothing out itself. */
export const tree = div('display: contents');

/**
 * Every `<style>` the Dashboard needs: `index.css` and all emotion output.
 * A `<style>` anywhere in a shadow tree styles the whole of it.
 */
export const styles = tree.appendChild(div('display: none'));

/** The React root's container. */
export const app = tree.appendChild(div('height: 100%'));

/** Where @hakit and our own overlays portal to, so they are styled too. */
export const portalRoot = tree.appendChild(div());

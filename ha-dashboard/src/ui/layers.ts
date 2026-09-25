/**
 * The panel's stacking order, in one place: what may cover what.
 *
 * Bottom to top: the panel, a Concern list (#30) or a `select` picker (#36),
 * a Popup (#28), then
 * @hakit's own entity Modal (z-index 1000, mounted into `<body>`).
 */

/**
 * Over the panel and under @hakit's own entity modal (z-index 1000, mounted
 * into `<body>`), so a long-press on a gate inside the Popup still opens its
 * modal on top.
 */
export const Z_POPUP = 900;

/**
 * Over the panel and under a Popup: a Popup that arrives while a Concern
 * list is open covers it without closing it (#30).
 */
export const Z_CONCERN_LIST = Z_POPUP - 1;

/**
 * The `select` picker (#36): panel-local like a Concern list, so on the same
 * layer -- a Popup covers it without closing it.
 */
export const Z_PICKER = Z_CONCERN_LIST;

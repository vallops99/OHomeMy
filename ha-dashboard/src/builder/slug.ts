/**
 * A Dashboard's slug: the `<slug>` in its panel's URL, `/ohomemy-<slug>`.
 *
 * The admin chooses it when the Dashboard is created (a duplicate is a new
 * Dashboard, so it gets a new one), and it never changes afterwards: a
 * rename keeps it, because a URL someone bookmarked or set as a default must
 * keep working. The rules are the server's (`document.py`, `SLUG`): lowercase
 * letters and digits joined by single hyphens, at most 40 characters, unique
 * in the document.
 */

export const SLUG_MAX = 40;

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Why a slug cannot be used, or `null` if it can. */
export type SlugProblem = 'empty' | 'format' | 'too_long' | 'taken';

export function slugProblem(slug: string, taken: Iterable<string>): SlugProblem | null {
  if (slug === '') return 'empty';
  if (!SLUG.test(slug)) return 'format';
  if (slug.length > SLUG_MAX) return 'too_long';
  for (const other of taken) if (other === slug) return 'taken';
  return null;
}

/**
 * The slug a name suggests: accents dropped, everything that is not a letter
 * or a digit turned into one hyphen, cut to fit. `''` when the name has no
 * Latin letter or digit at all, e.g. a name written only in another script;
 * the admin then types one.
 */
export function slugify(name: string): string {
  const slug = name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return trim(slug, SLUG_MAX);
}

/**
 * `base` if it is free, else `base-2`, `base-3`, ...: always a valid slug not
 * in `taken`. A `base` that is not a valid slug is slugified first, and one
 * that slugifies to nothing becomes `dashboard`.
 */
export function uniqueSlug(base: string, taken: Iterable<string>): string {
  const used = new Set(taken);
  const root = slugify(base) || 'dashboard';
  if (!used.has(root)) return root;
  for (let n = 2; ; n++) {
    const suffix = `-${n}`;
    const candidate = `${trim(root, SLUG_MAX - suffix.length)}${suffix}`;
    if (!used.has(candidate)) return candidate;
  }
}

/** `slug` cut to `max` characters, never ending on a hyphen. */
function trim(slug: string, max: number): string {
  return slug.slice(0, max).replace(/-+$/, '');
}

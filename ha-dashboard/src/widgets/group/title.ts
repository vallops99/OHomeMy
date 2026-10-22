/**
 * A Group's title (ADR-0017): only what someone wrote, as written. It has no
 * Default title, so with none written, or an empty one, the card has none.
 *
 * No React, so `title.test.ts` runs it under plain Node.
 */
export function groupTitle(title: string | null): string | undefined {
  return title || undefined;
}

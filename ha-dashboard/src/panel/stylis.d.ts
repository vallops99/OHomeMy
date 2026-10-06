// stylis 4 ships no types; this is the one export the panel build uses.
declare module 'stylis' {
  import type { StylisPlugin } from '@emotion/cache';
  export const prefixer: StylisPlugin;
}

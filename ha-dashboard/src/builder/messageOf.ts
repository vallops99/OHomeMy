/** What went wrong, for the admin. Home Assistant rejects a command with `{ code, message }`, not an Error. */
export const messageOf = (err: unknown) =>
  typeof err === 'object' && err !== null && 'message' in err && typeof err.message === 'string' ? err.message : String(err);

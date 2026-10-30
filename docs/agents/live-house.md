# Live house

`ha-local` is a Docker container running Home Assistant with the fake house
(`fake-house/README.md`) loaded. It is normally up on this machine, so checks
that need a real Home Assistant can run inside an agent session.

- **Is it up?** `docker ps --filter name=ha-local`. If it is stopped,
  `docker start ha-local`.
- **Credentials**: `ha-dashboard/.env` holds `VITE_HA_URL`,
  `ha-dashboard/.env.development` the token. Both are gitignored; read them in
  place and keep their values out of commits, issues and reports. The URL ends
  in `/`, so strip it before appending `/api/...`.
- **After editing `fake-house/manifest.yaml`**: regenerate and re-apply as in
  "Rebuilding `ha-local` from scratch" in `fake-house/README.md`. Step 2 is
  needed only for config-entry helpers (cameras, sirens). Before restarting,
  run `fake-house/scripts/check-config.sh`: Home Assistant's own config check
  over the generated packages, in a throwaway container.
- **Fit**: `npm run fit -- --least` measures each Widget's Smallest box;
  `npm run fit` checks them. Both run in `ha-dashboard/` inside `nix develop`,
  which sets `CHROME`. `scripts/fit-house.ts` drives the house into its fullest
  state and restores it afterwards; it finds each entity's backing helpers in
  `fake-house/helpers.json`, which `generate.py` writes.

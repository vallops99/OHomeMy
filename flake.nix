{
  description = "Home Assistant frontend dashboard built on @hakit (ha-component-kit)";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-26.05";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs =
    { nixpkgs, flake-utils, ... }:
    flake-utils.lib.eachDefaultSystem (
      system:
      let
        pkgs = import nixpkgs { inherit system; };
        # ha-component-kit needs node >= 20 / npm >= 10; nixpkgs 26.05 defaults to node 24,
        # which bundles npm 11. npm comes with the nodejs derivation, no separate package.
        nodejs = pkgs.nodejs;
        # fake-house/scripts/*.py generate Home Assistant packages from the manifest
        # and talk to HA's websocket registry API.
        python = pkgs.python3.withPackages (ps: [ ps.pyyaml ps.aiohttp ]);
        # ha-dashboard/scripts/fit-widgets.ts drives a browser to assert each
        # Widget's content fits its box (#72). Playwright's own bundled
        # Chromium cannot run on NixOS -- it dies on libglib-2.0.so.0 -- so the
        # harness uses this one via $CHROME. Without it in the devshell, the
        # recipe is a /nix/store path someone found by hand, which is exactly
        # how it got lost and re-derived three times.
        chromium = pkgs.chromium;
      in
      {
        devShells.default = pkgs.mkShell {
          packages = [
            nodejs
            pkgs.git
            pkgs.gh
            # @hakit/core ships a `hakit-sync-types` CLI that reads a .env; jq is handy
            # for poking at the generated Home Assistant type/locale JSON.
            pkgs.jq
            python
            chromium
          ];

          shellHook = ''
            echo "node $(node --version) / npm $(npm --version)"
            # keep npm's global installs in-project rather than in $HOME
            export NPM_CONFIG_PREFIX="$PWD/.npm-global"
            export PATH="$NPM_CONFIG_PREFIX/bin:$PWD/node_modules/.bin:$PATH"
            # What `npm run fit` launches; see the chromium note above.
            export CHROME="${chromium}/bin/chromium"
          '';
        };
      }
    );
}

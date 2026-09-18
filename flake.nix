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
          ];

          shellHook = ''
            echo "node $(node --version) / npm $(npm --version)"
            # keep npm's global installs in-project rather than in $HOME
            export NPM_CONFIG_PREFIX="$PWD/.npm-global"
            export PATH="$NPM_CONFIG_PREFIX/bin:$PWD/node_modules/.bin:$PATH"
          '';
        };
      }
    );
}

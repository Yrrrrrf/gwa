# GWA · Server — db shell.
#
# SurrealDB 3.x runs in a container (db.Dockerfile) because surreal v3
# isn't in nixpkgs yet. This shell only needs:
#   - podman + podman-compose to drive the container
#   - curl for db/scripts/init-db.sh
#
# No rust, no go, no deno. Lean on purpose.

{
  description = "GWA · Server — db (SurrealDB container shell)";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";

    # Parent dir as a non-flake source — gives us access to pkgs.nix
    # without depending on the parent flake (avoids circular evaluation).
    shared = {
      url = "path:..";
      flake = false;
    };
  };

  outputs =
    { self, nixpkgs, flake-utils, shared }:
    flake-utils.lib.eachDefaultSystem (
      system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
        groups = import "${shared}/pkgs.nix" { inherit pkgs; };
      in
      {
        devShells.default = pkgs.mkShell {
          name = "gwa-db";

          packages =
            groups.base
            ++ groups.container
            ++ groups.net;       # curl for init-db.sh

          shellHook = ''
            echo "🗄️  db shell — podman + curl ready"
          '';
        };
      }
    );
}

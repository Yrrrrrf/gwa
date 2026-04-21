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
    {
      self,
      nixpkgs,
      flake-utils,
      shared,
    }:
    flake-utils.lib.eachDefaultSystem (
      system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
        groups = import "${shared}/pkgs.nix" { inherit pkgs; };
      in
      {
        devShells.default = pkgs.mkShell {
          name = "gwa-db";

          packages = groups.base ++ groups.container ++ groups.net; # curl for init-db.sh

          shellHook = ''
            ${groups.shell.colorVars}
            echo "🗄️  ''${PURPLE}db shell ''${RESET}— podman + curl ready"
          '';
        };
      }
    );
}

{
  description = "GWA · Server";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs =
    {
      self,
      nixpkgs,
      flake-utils,
    }:
    flake-utils.lib.eachDefaultSystem (
      system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
      in
      {
        devShells.default = pkgs.mkShell {
          name = "gwa-server";

          packages = with pkgs; [
            just # command runner
            podman # container engine
            podman-compose # container orchestration
            curl # needed for db/scripts/init-db.sh
            xh # needed for db/test/fixtures.sh
          ];

          shellHook = ''
            # Set colors for a nicer output
            PURPLE=$(tput setaf 5)
            CYAN=$(tput setaf 6)
            RESET=$(tput sgr0)

            # Get clean versions
            JUST_V=$(just --version | awk '{print $2}')
            PODMAN_V=$(podman --version | awk '{print $3}')

            # Use ''${} so Nix ignores it and lets bash evaluate the variables!
            echo "🦇 ''${PURPLE}GWA Server ''${RESET}[✅ ''${CYAN}v''${JUST_V}''${RESET} | 📦 ''${CYAN}v''${PODMAN_V}''${RESET}]"
          '';
        };
      }
    );
}

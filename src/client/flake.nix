{
  description = "GWA · client";

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
          name = "gwa-client";

          packages = with pkgs; [
            deno # runtime · install · test · task runner
            nushell # shell runner for just recipes
            just # justfile commands (client.just)
            nodejs # peer requirement for some vite/npm: deps
            podman # container engine
            podman-compose # container orchestration
          ];

          shellHook = ''
            # Set colors for a nicer output
            PURPLE=$(tput setaf 5)
            CYAN=$(tput setaf 6)
            RESET=$(tput sgr0)

            # Get clean versions
            DENO_V=$(deno --version | head -n 1 | awk '{print $2}')
            JUST_V=$(just --version | awk '{print $2}')
            PODMAN_V=$(podman --version | awk '{print $3}')

            # Use ''${} so Nix ignores it and lets bash evaluate the variables!
            echo "🦇 ''${PURPLE}GWA Client ''${RESET}[🦕 ''${CYAN}v''${DENO_V}''${RESET} | ✅ ''${CYAN}v''${JUST_V}''${RESET} | 📦 ''${CYAN}v''${PODMAN_V}''${RESET}]"
          '';
        };
      }
    );
}

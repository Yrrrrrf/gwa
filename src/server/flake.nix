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
            protobuf # protoc
            buf # for proto generation
            grpcurl # for rpc health checks
            deno # for tests
            go # for rpc service
            rustup # for rust engine
          ];

          shellHook = ''
            # Set colors for a nicer output
            PURPLE=$(tput setaf 5)
            CYAN=$(tput setaf 6)
            RESET=$(tput sgr0)

            # Get clean versions
            JUST_V=$(just --version | awk '{print $2}')
            PODMAN_V=$(podman --version | awk '{print $3}')
            DENO_V=$(deno --version | head -n1 | awk '{print $2}')
            GO_V=$(go version | awk '{print $3}' | sed 's/go//')

            # Use ''${} so Nix ignores it and lets bash evaluate the variables!
            echo "🦇 ''${PURPLE}GWA Server ''${RESET}[✅ ''${CYAN}v''${JUST_V}''${RESET} | 📦 ''${CYAN}v''${PODMAN_V}''${RESET} | 🦕 ''${CYAN}v''${DENO_V}''${RESET} | 🐹 ''${CYAN}v''${GO_V}''${RESET}]"
          '';
        };
      }
    );
}

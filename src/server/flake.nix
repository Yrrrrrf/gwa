# GWA · Server — root flake.
#
# Two responsibilities:
#   1. Provide a kitchen-sink `nix develop` that opens the full stack.
#   2. Re-export every sub-flake's shell so `nix develop .#engine` works
#      from the server root without `cd engine`.
#
# Sub-flakes are independent — they consume only `pkgs.nix` (via a
# non-flake path input), not this flake. That's deliberate: it keeps the
# dependency graph acyclic while still letting this root pull them in.

{
  description = "GWA · Server — microkernel root flake";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";

    # Sub-flakes — each is independently usable via `cd <dir> && nix develop`.
    db.url     = "path:./db";
    engine.url = "path:./engine";
    rpc.url    = "path:./rpc";
    proto.url  = "path:./proto";
    tests.url  = "path:./tests";
  };

  outputs =
    { self, nixpkgs, flake-utils, db, engine, rpc, proto, tests }:
    flake-utils.lib.eachDefaultSystem (
      system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
        groups = import ./pkgs.nix { inherit pkgs; };
      in
      {
        devShells = {
          # Default: everything available in one shell. Use this when you'll
          # touch multiple components in one session.
          default = pkgs.mkShell {
            name = "gwa-server";

            packages =
              groups.base
              ++ groups.container
              ++ groups.protobuf
              ++ groups.rust
              ++ groups.go
              ++ groups.deno
              ++ groups.net;

            shellHook = ''
              PURPLE=$(tput setaf 5)
              CYAN=$(tput setaf 6)
              RESET=$(tput sgr0)

              JUST_V=$(just --version | awk '{print $2}')
              PODMAN_V=$(podman --version | awk '{print $3}')
              DENO_V=$(deno --version | head -n1 | awk '{print $2}')
              GO_V=$(go version | awk '{print $3}' | sed 's/go//')

              echo "🦇 ''${PURPLE}GWA Server ''${RESET}[✅ ''${CYAN}v''${JUST_V}''${RESET} | 📦 ''${CYAN}v''${PODMAN_V}''${RESET} | 🦕 ''${CYAN}v''${DENO_V}''${RESET} | 🐹 ''${CYAN}v''${GO_V}''${RESET}]"
              echo "   sub-shells: nix develop .#{db,engine,rpc,proto,tests}"
            '';
          };

          # Per-component shells — re-exported for `nix develop .#engine` etc.
          # Useful in CI steps that only need one toolchain.
          db     = db.devShells.${system}.default;
          engine = engine.devShells.${system}.default;
          rpc    = rpc.devShells.${system}.default;
          proto  = proto.devShells.${system}.default;
          tests  = tests.devShells.${system}.default;
        };
      }
    );
}

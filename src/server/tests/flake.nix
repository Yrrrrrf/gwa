# GWA · Server — tests shell.
#
# Unified Deno test suite. Talks HTTP/SQL to Surreal, GraphQL to the
# engine, and shells out to grpcurl for the rpc (sidecar is native gRPC,
# not Connect/grpc-web).
#
# Needs:
#   - deno (test runner)
#   - grpcurl (rpc tests + preflight health check)
#   - curl, jq (general probing)

{
  description = "GWA · Server — tests (Deno + grpcurl)";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";

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
          name = "gwa-tests";

          packages =
            groups.base
            ++ groups.deno
            ++ groups.net;       # grpcurl, curl, jq, xh

          shellHook = ''
            DENO_V=$(deno --version | head -n1 | awk '{print $2}')
            echo "🦕 tests shell — deno v''${DENO_V} + grpcurl"
          '';
        };
      }
    );
}

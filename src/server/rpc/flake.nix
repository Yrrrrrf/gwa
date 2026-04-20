# GWA · Server — rpc shell.
#
# Go gRPC sidecar (notifier + documents). Needs:
#   - go (compiler + module tooling)
#   - protobuf + buf (regenerating Go stubs from ../proto)
#   - grpcurl (local health/sanity checks during dev)
#
# Note: `buf` is in protobuf group because rpc and proto both need it.

{
  description = "GWA · Server — rpc (Go gRPC sidecar)";

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
          name = "gwa-rpc";

          packages =
            groups.base
            ++ groups.go
            ++ groups.protobuf
            ++ [ pkgs.grpcurl ];  # also in groups.net but tests own that

          shellHook = ''
            GO_V=$(go version | awk '{print $3}' | sed 's/go//')
            echo "🐹 rpc shell — go v''${GO_V} + buf + grpcurl"
          '';
        };
      }
    );
}

# GWA · Server — proto shell.
#
# Source of truth for .proto files. This shell exists so you can lint,
# format, and run breaking checks WITHOUT pulling in rust or go toolchains.
#
# Typical usage:
#   nix develop .#proto
#   buf lint
#   buf format -w
#   buf breaking --against '.git#branch=main'
#   buf generate    # then commit generated stubs in rpc/

{
  description = "GWA · Server — proto (buf + protobuf only)";

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
          name = "gwa-proto";

          packages =
            groups.base
            ++ groups.protobuf;

          shellHook = ''
            BUF_V=$(buf --version 2>&1)
            echo "📜 proto shell — buf v''${BUF_V} + protoc"
          '';
        };
      }
    );
}

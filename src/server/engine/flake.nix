# GWA · Server — engine shell.
#
# Rust workspace (domain, store, application, gateway, wasm).
# Needs:
#   - cargo/rustc/rustfmt/clippy
#   - protobuf (tonic-build's compile_protos in gateway/build.rs)
#
# Does NOT need: buf (proto/ owns generation), grpcurl (tests own that),
# go, deno. Keeping it minimal cuts shell startup and makes intent obvious.

{
  description = "GWA · Server — engine (Rust gateway + workspace)";

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
          name = "gwa-engine";

          packages =
            groups.base
            ++ groups.rust
            ++ groups.protobuf;  # required by tonic-prost-build at build.rs time

          shellHook = ''
            RUSTC_V=$(rustc --version | awk '{print $2}')
            echo "🦀 engine shell — rustc v''${RUSTC_V} + protobuf"
          '';
        };
      }
    );
}

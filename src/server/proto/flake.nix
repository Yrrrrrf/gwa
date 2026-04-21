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
          name = "gwa-proto";

          packages = groups.base ++ groups.protobuf;

          shellHook = ''
            ${groups.shell.colorVars}
            BUF_V=$(buf --version 2>&1)
            echo "📜 ''${PURPLE}proto shell ''${RESET}— buf ''${CYAN}v''${BUF_V}''${RESET} + protoc"
          '';
        };
      }
    );
}

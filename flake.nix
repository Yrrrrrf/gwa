{
  description = "Xibalbá";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";

    client.url = "path:./src/client";
    server.url = "path:./src/server";
  };

  outputs =
    {
      self,
      nixpkgs,
      flake-utils,
      client,
      server,
    }:
    flake-utils.lib.eachDefaultSystem (
      system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
        clientShell = client.devShells.${system}.default;
        serverShell = server.devShells.${system}.default;
      in
      {
        devShells.default = pkgs.mkShell {
          name = "xibalba";

          inputsFrom = [
            clientShell
            serverShell
          ];

          shellHook = ''
            PURPLE=$(tput setaf 5)
            RESET=$(tput sgr0)
            echo "🦇 ''${PURPLE}Xibalbá''${RESET} — all systems go"
          '';
        };
      }
    );
}

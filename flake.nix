{
  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixpkgs-unstable";
  };
  outputs = {
    nixpkgs,
    self,
    ...
  }: let
    forAllSystems = function:
      nixpkgs.lib.genAttrs nixpkgs.lib.systems.flakeExposed
      (system: function nixpkgs.legacyPackages.${system});
  in {
    formatter = forAllSystems (pkgs: pkgs.alejandra);

    packages = forAllSystems (pkgs: {
      mlg = pkgs.writeShellScriptBin "mlg" ''
        exec ${pkgs.bun}/bin/bunx --bun @samuelho-dev/monorepo-library-generator "$@"
      '';
      default = self.packages.${pkgs.system}.mlg;
    });

    devShells = forAllSystems (pkgs: {
      default = pkgs.mkShell {
        packages = with pkgs; [
          bun
          corepack
          nodejs_22
          # For systems that do not ship with Python by default (required by `node-gyp`)
          python3
        ];
      };
    });
  };
}

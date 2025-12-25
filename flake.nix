{
  description = "Project with dev-config integration";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    dev-config.url = "github:samuelho-dev/dev-config";
  };

  outputs = {
    nixpkgs,
    dev-config,
    ...
  }: let
    # Supported systems
    systems = ["aarch64-darwin" "x86_64-darwin" "x86_64-linux" "aarch64-linux"];

    # Helper to generate attrs for all systems
    forAllSystems = fn:
      nixpkgs.lib.genAttrs systems (system:
        fn {
          pkgs = nixpkgs.legacyPackages.${system};
          inherit system;
        });
  in {
    devShells = forAllSystems ({pkgs, ...}: {
      default = pkgs.mkShell {
        packages = [
          # Add your project dependencies here
          # pkgs.nodejs_20
          # pkgs.bun
        ];

        shellHook = ''
          ${dev-config.lib.devShellHook}

          # Add project-specific shell setup here
          echo "🚀 Development environment ready"
        '';
      };
    });

    # Optional: Add formatter
    formatter = forAllSystems ({pkgs, ...}: pkgs.alejandra);
  };
}

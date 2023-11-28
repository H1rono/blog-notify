{
  description = "crowi → traQ Webhook with GAS";

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixpkgs-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils, ... }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
      in
      {
        formatter = pkgs.nixpkgs-fmt;

        devShells.default = pkgs.stdenv.mkDerivation {
          name = "node-and-clasp";
          nativeBuildInputs = with pkgs; [ nodejs_20 google-clasp ];
        };
      }
    );
}

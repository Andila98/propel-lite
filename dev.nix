{ pkgs, ... }: {
  packages = [
    pkgs.nodejs_20
    pkgs.bfg-repo-cleaner
  ];
}

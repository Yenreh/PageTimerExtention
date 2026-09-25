#!/usr/bin/env bash
# Package the extension for the stores.
# src/ is the Chrome extension as is (load it unpacked to test).
# dist/firefox/ is src/ with manifest.firefox.json merged over the manifest;
# a null value there removes a Chrome-only key. Load it as a temporary add-on.
# Usage: ./build.sh [--zip]   --zip also writes dist/page-timer-<browser>-<version>.zip
set -euo pipefail
cd "$(dirname "$0")"

NAME=page-timer
version=$(jq -r .version src/manifest.json)
zip_dir() {
  (cd "$1" && zip -rq -FS "$OLDPWD/dist/$NAME-$2-$version.zip" . -x '.*' '*/.*')
}

rm -rf dist
mkdir -p dist

if [ -f manifest.firefox.json ]; then
  mkdir -p dist/firefox
  cp -r src/. dist/firefox/
  jq -s '.[0] * .[1] | walk(if type == "object" then with_entries(select(.value != null)) else . end)' \
    src/manifest.json manifest.firefox.json > dist/firefox/manifest.json
  echo "Built dist/firefox (v$version)"
fi

if [ "${1:-}" = --zip ]; then
  zip_dir src chrome
  [ -d dist/firefox ] && zip_dir dist/firefox firefox
  ls -l dist/*.zip
fi

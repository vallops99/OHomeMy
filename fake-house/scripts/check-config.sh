#!/usr/bin/env bash
# Generates the fake house into a scratch Home Assistant config and runs Home
# Assistant's own config check over it, in a throwaway container. Exits non-zero
# when Home Assistant would reject a package. Needs Docker and PyYAML.
#
#     fake-house/scripts/check-config.sh [image]
set -euo pipefail

image=${1:-ghcr.io/home-assistant/home-assistant:stable}
here=$(cd "$(dirname "$0")" && pwd)
config=$(mktemp -d)
trap 'rm -rf "$config"' EXIT

printf 'homeassistant:\n  packages: !include_dir_named packages\n' > "$config/configuration.yaml"
# generate.py also rewrites the committed helpers.json; it is deterministic.
python3 "$here/generate.py" --config-dir "$config" > /dev/null

out=$(docker run --rm --entrypoint python -v "$config:/config" "$image" \
  -m homeassistant --script check_config -c /config 2>&1 | sed 's/\x1b\[[0-9;]*m//g')
if grep -qE 'Incorrect config|Failed config|Configuration invalid' <<< "$out"; then
  echo "$out"
  exit 1
fi
echo "Home Assistant accepts the fake house's packages."

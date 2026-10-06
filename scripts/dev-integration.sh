#!/usr/bin/env bash
# The OHomeMy dev loop: build every frontend bundle, copy them into the
# integration, install the integration into a local Home Assistant and
# restart it.
#
#     nix develop --command scripts/dev-integration.sh
#
# Then add OHomeMy once from Settings -> Devices & services. Each later run
# picks up both Python and frontend changes, since a restart re-reads the
# bundles' hashes.
#
#   HA_CONFIG     Home Assistant's config dir   (~/projects/home-assistant/config)
#   HA_CONTAINER  its Docker container          (ha-local)
#   HA_URL        where it answers              (http://localhost:8123)
#   --no-restart  build and copy only
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
HA_CONFIG="${HA_CONFIG:-$HOME/projects/home-assistant/config}"
HA_CONTAINER="${HA_CONTAINER:-ha-local}"
HA_URL="${HA_URL:-http://localhost:8123}"
COMPONENT="$ROOT/custom_components/ohomemy"

# One line per bundle: the npm script that builds it, the directory it builds
# into (under ha-dashboard/), and its custom element, which names its
# directory under frontend/ (custom_components/ohomemy/bundles.py).
BUNDLES=(
  "build:panel dist-panel ohomemy-dashboard"
)

for bundle in "${BUNDLES[@]}"; do
  read -r script out element <<<"$bundle"
  echo "==> npm run $script"
  (cd "$ROOT/ha-dashboard" && npm run --silent "$script")
  rm -rf "${COMPONENT:?}/frontend/$element"
  cp -r "$ROOT/ha-dashboard/$out" "$COMPONENT/frontend/$element"
done

# Copied, not symlinked: the container sees only its bind-mounted config dir.
echo "==> install into $HA_CONFIG/custom_components/ohomemy"
mkdir -p "$HA_CONFIG/custom_components"
# Home Assistant compiles the component as root, so its __pycache__ is
# removed from inside the container.
docker exec "$HA_CONTAINER" rm -rf /config/custom_components/ohomemy/__pycache__ 2>/dev/null || true
rm -rf "$HA_CONFIG/custom_components/ohomemy"
cp -r "$COMPONENT" "$HA_CONFIG/custom_components/ohomemy"
find "$HA_CONFIG/custom_components/ohomemy" -name __pycache__ -prune -exec rm -rf {} +

[[ "${1:-}" == "--no-restart" ]] && exit 0

echo "==> restart $HA_CONTAINER"
docker restart "$HA_CONTAINER" >/dev/null
for _ in $(seq 1 120); do
  if curl -fs -o /dev/null "$HA_URL/manifest.json"; then
    echo "==> Home Assistant is up at $HA_URL"
    exit 0
  fi
  sleep 1
done
echo "Home Assistant did not come back within 120 s" >&2
exit 1

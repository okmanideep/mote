#!/usr/bin/env bash
set -Eeuo pipefail

repo_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_dir"

npm install
npm install -g .

site_port="$(node --input-type=module -e "import fs from 'node:fs'; import path from 'node:path'; import envPaths from 'env-paths'; const configPath = path.join(envPaths('mote', { suffix: '' }).config, 'config.json'); console.log(JSON.parse(fs.readFileSync(configPath, 'utf8')).site_port)")"
if [[ ! "$site_port" =~ ^[0-9]+$ ]]; then
  echo "Invalid Mote site_port in config: $site_port" >&2
  exit 1
fi

restore_tailscale_serve=0
restore_serve() {
  local exit_code=$?
  trap - EXIT
  if [[ "$restore_tailscale_serve" == 1 ]]; then
    echo "Restoring Tailscale Serve on port $site_port" >&2
    tailscale serve --bg --http="$site_port" "localhost:$site_port" || true
  fi
  exit "$exit_code"
}
trap restore_serve EXIT

if command -v tailscale >/dev/null 2>&1 && tailscale status >/dev/null 2>&1; then
  serve_status="$(tailscale serve status --json)"
  if printf '%s' "$serve_status" | SITE_PORT="$site_port" node -e '
    let status = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", chunk => status += chunk);
    process.stdin.on("end", () => {
      const config = JSON.parse(status);
      process.exit(config.TCP?.[process.env.SITE_PORT]?.HTTP === true ? 0 : 1);
    });
  '; then
    restore_tailscale_serve=1
    # Free the port while Mote restarts; Serve can otherwise prevent Mote from
    # binding its configured site port after the old process exits.
    tailscale serve --http="$site_port" off
  else
    echo "Tailscale Serve is not using HTTP port $site_port; leaving its configuration unchanged."
  fi
else
  echo "Tailscale CLI is unavailable or disconnected; skipping Serve setup."
fi

mote restart
curl --fail --silent --show-error --retry 20 --retry-connrefused --retry-delay 1 \
  --max-time 3 "http://localhost:$site_port/status" >/dev/null

if [[ "$restore_tailscale_serve" == 1 ]]; then
  tailscale serve --bg --http="$site_port" "localhost:$site_port"
  restore_tailscale_serve=0
fi

echo "Mote installed and restarted on port $site_port."

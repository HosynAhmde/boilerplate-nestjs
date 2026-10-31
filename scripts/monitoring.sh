#!/usr/bin/env bash
# Starts (or updates) the monitoring stack: Prometheus, Alertmanager, Grafana,
# Loki, Alloy and the exporters. Run on the server after `make deploy`.
#   ./scripts/monitoring.sh          start / apply config changes
#   ./scripts/monitoring.sh down     stop the monitoring stack (keeps its data)
set -euo pipefail
cd "$(dirname "$0")/.."

SERVICES=(prometheus alertmanager grafana loki alloy node-exporter postgres-exporter redis-exporter)
compose() { docker compose --profile monitoring "$@"; }

if [ "${1:-}" = "down" ]; then
  compose stop "${SERVICES[@]}"
  exit 0
fi

. scripts/env.sh && load_env
if [ -z "${GRAFANA_ADMIN_PASSWORD:-}" ]; then
  echo "Set GRAFANA_ADMIN_PASSWORD in .env first (e.g. openssl rand -base64 18)." >&2
  exit 1
fi

compose up -d "${SERVICES[@]}"
# pick up edited prometheus.yml / alerts.yml without a restart
curl -fsS -X POST http://127.0.0.1:9090/-/reload >/dev/null 2>&1 || true

cat <<MSG
Monitoring is running. All UIs listen on 127.0.0.1; from your computer run:
  ssh -L 3001:127.0.0.1:3001 -L 9090:127.0.0.1:9090 -L 9093:127.0.0.1:9093 <user>@<server>
Then open:
  Grafana       http://localhost:3001   (user: ${GRAFANA_ADMIN_USER:-admin})
  Prometheus    http://localhost:9090
  Alertmanager  http://localhost:9093
MSG

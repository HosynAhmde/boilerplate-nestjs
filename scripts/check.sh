#!/usr/bin/env bash
# Local quality gate (replaces hosted CI): format, lint, typecheck, tests, build.
# Run before every push:  ./scripts/check.sh   (or: make check)
# Pass --e2e to also run API e2e tests (needs `make infra-up` and migrations).
set -euo pipefail
cd "$(dirname "$0")/.."

step() { printf '\n\033[1;34m==> %s\033[0m\n' "$1"; }

step "format";    pnpm format:check
step "lint";      pnpm lint
step "typecheck"; pnpm typecheck
step "unit tests"; pnpm test
if [ "${1:-}" = "--e2e" ]; then
  step "api e2e tests"; pnpm --filter api test:e2e
fi
step "build";     pnpm build
printf '\n\033[1;32mAll checks passed.\033[0m\n'

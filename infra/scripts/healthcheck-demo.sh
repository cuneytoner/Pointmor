#!/usr/bin/env sh
# Prompt / doküman uyumu: `healthcheck-demo.sh` → `health-check-demo.sh`
exec "$(CDPATH= cd -- "$(dirname "$0")" && pwd)/health-check-demo.sh" "$@"

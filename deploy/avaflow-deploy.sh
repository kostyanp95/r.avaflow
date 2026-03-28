#!/bin/bash
set -euo pipefail

# Pull-based deploy for r.avaflow on RGT-PC
# Crontab: */5 * * * * /opt/avaflow/deploy/avaflow-deploy.sh >> /var/log/avaflow-deploy.log 2>&1

COMPOSE_FILE="${COMPOSE_FILE:-/opt/avaflow/docker-compose.yml}"
IMAGES=("ghcr.io/kostyanp95/r-avaflow:webapp-latest" "ghcr.io/kostyanp95/r-avaflow:webapp-40g-latest")

UPDATED=false
for IMAGE in "${IMAGES[@]}"; do
  REMOTE=$(docker manifest inspect "$IMAGE" 2>/dev/null | grep -m1 '"digest"' | cut -d'"' -f4)
  LOCAL=$(docker inspect "$IMAGE" 2>/dev/null | jq -r '.[0].RepoDigests[0] // empty' | cut -d@ -f2)

  if [ -n "$REMOTE" ] && [ "$REMOTE" != "$LOCAL" ]; then
    echo "$(date -Iseconds): Pulling new image $IMAGE"
    docker pull "$IMAGE"
    UPDATED=true
  fi
done

if [ "$UPDATED" = true ]; then
  echo "$(date -Iseconds): Restarting services..."
  docker compose -f "$COMPOSE_FILE" up -d
  echo "$(date -Iseconds): Deploy complete"
fi

#!/bin/bash

CONTAINER_NAME="devpg"
POSTGRES_IMAGE="postgres:17"
POSTGRES_DB="devdb"
POSTGRES_PASSWORD="Password1!"
DATA_DIR="/docker/postgresql/data"

if [ "$1" = "stop" ]; then
  echo "Docker running, is going to stop"
  docker container stop "$CONTAINER_NAME"
  echo "Docker stopped"
  exit 0
fi

if ! docker ps -a --format '{{.Names}}' | grep -w "$CONTAINER_NAME" >/dev/null 2>&1; then
  echo "Docker is going to run"
  docker run --name "$CONTAINER_NAME" \
    -e POSTGRES_DB="$POSTGRES_DB" \
    -e POSTGRES_PASSWORD="$POSTGRES_PASSWORD" \
    -d \
    -p 5432:5432 \
    -v "$DATA_DIR:/var/lib/postgresql/data" \
    "$POSTGRES_IMAGE"
else
  if docker ps --format '{{.Names}}' | grep -w "$CONTAINER_NAME" >/dev/null 2>&1; then
    echo "Docker running, is going to stop"
    docker container stop "$CONTAINER_NAME"
    echo "Docker stopped"
  fi

  echo "Docker is going to start"
  docker container start "$CONTAINER_NAME"
fi

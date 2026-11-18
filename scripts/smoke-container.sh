#!/bin/sh
set -eu
# Builds the current checkout and publishes only to the loopback interface.
image=montecarlo-lab:smoke
docker build -t "$image" .
container=$(docker run --rm -d -p 127.0.0.1::8123 -e PORT=8123 "$image")
trap 'docker stop "$container" >/dev/null' EXIT
port=$(docker port "$container" 8123/tcp | head -n 1 | cut -d: -f2)
url="http://127.0.0.1:$port"
# The port proxy can accept and reset connections before Caddy listens, so retry on any error.
curl --retry 30 --retry-delay 1 --retry-all-errors --max-time 5 --fail --silent "$url/builder" -o /dev/null
LAB_TEST_URL="$url" npm run test:browser

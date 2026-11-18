#!/bin/sh
set -eu
# Builds the current checkout and publishes only to the loopback interface.
image=montecarlo-lab:smoke
docker build -t "$image" .
container=$(docker run --rm -d -p 127.0.0.1::8123 -e PORT=8123 "$image")
trap 'docker stop "$container" >/dev/null' EXIT
port=$(docker port "$container" 8123/tcp | cut -d: -f2)
url="http://127.0.0.1:$port"
# Docker accepts connections before the server listens, so retry resets as well as refusals.
curl --retry 15 --retry-delay 1 --retry-all-errors --fail --silent "$url/builder" -o /dev/null
LAB_TEST_URL="$url" npm run test:browser

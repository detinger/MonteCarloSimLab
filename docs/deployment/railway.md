# Deploying to Railway

Railway runs the same static build as Netlify, served by Caddy from a multi-stage Docker image. Do not deploy `vite dev` or `vite preview` as the production server.

## Files

| File | Role |
| --- | --- |
| [`Dockerfile`](../../Dockerfile) | Stage 1: `node:22-alpine`, `npm ci`, `npm run build`. Stage 2: `caddy:2-alpine` serving `/srv` |
| [`Caddyfile`](../../Caddyfile) | Listens on `:{$PORT:3000}`, gzip/zstd, `try_files {path} /index.html` SPA fallback |
| [`.dockerignore`](../../.dockerignore) | Allow-list: only sources, lockfile and configs enter the build context (no `.git`, `node_modules`, `.env`, test output) |

## Steps

1. In Railway choose **New Project → Deploy from GitHub repo** and select the repository. Railway detects the `Dockerfile`.
2. Leave the root directory as the repository root. No environment variables are needed. Railway injects `PORT`, and Caddy binds to it on all interfaces.
3. Under **Settings → Networking** generate a Railway domain. Railway terminates HTTPS in front of the container.

The container is stateless. User work lives in the browser, never on the container disk, so redeploys and restarts lose nothing server-side.

## Local smoke test

[`scripts/smoke-container.sh`](../../scripts/smoke-container.sh) builds the image, runs it with `PORT=8123`, checks that the deep link `/builder` returns the app, then runs the full Playwright suite against the container:

```sh
npx playwright install chromium   # once
sh scripts/smoke-container.sh
```

Manual equivalent:

```sh
docker build -t simulation-lab .
docker run --rm -p 3000:3000 -e PORT=3000 simulation-lab
curl -f http://127.0.0.1:3000/builder
```

## Workers, routing and saved work

These behave the same as on Netlify; see [netlify.md](./netlify.md#routing-and-workers). Projects saved on one origin are not visible on another. Use JSON export and import to move them.

## Rollback

In the service's **Deployments** tab, open an earlier successful deployment and choose **Redeploy**.

## Status

On 18 November 2026 `scripts/smoke-container.sh` passed locally on Docker (macOS, arm64): the image built, `/builder` was served, and all 21 browser tests passed against the container. The app has **not** been deployed to Railway. The owner chose to keep it local for now.

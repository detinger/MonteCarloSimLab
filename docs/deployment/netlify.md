# Deploying to Netlify

The lab is a static Vite single-page app. It needs no backend, environment secrets, database or login.

## Settings

All settings live in [`netlify.toml`](../../netlify.toml); nothing has to be entered in the Netlify UI.

| Setting | Value |
| --- | --- |
| Base directory | repository root |
| Build command | `npm run build` |
| Publish directory | `dist` |
| Node version | `22` (`NODE_VERSION` in `netlify.toml`; `package.json` requires `>=22.12`) |
| Environment variables | none |
| SPA fallback | `/*` → `/index.html` (status 200) |

## Steps

1. In Netlify choose **Add new site → Import an existing project** and select the GitHub repository.
2. Accept the detected settings (they come from `netlify.toml`) and deploy.
3. Netlify provides HTTPS on the `*.netlify.app` domain automatically; custom domains get a managed certificate once DNS points at Netlify.

## Routing and workers

- In-app navigation uses hash routes (`/#/builder`, `/#/pi`), which work on any static host. Plain paths such as `/builder` are also accepted; the redirect rule serves `index.html` for them.
- Simulations run in module Web Workers emitted by Vite as hashed files under `/assets/`. Netlify serves them as `application/javascript`. If you add a Content-Security-Policy header, it must allow `worker-src 'self'` and `script-src 'self'`.
- The app makes no network requests at runtime. All exports (Python, R, `.ipynb`, JSON, CSV, ZIP) are generated in the browser.

## Saved work

Projects and progress live in the browser's storage for that origin. Moving between Netlify and Railway (or between domains) does not carry them over. Use project/run JSON export and import.

## Verification

Before deploying, run locally:

```sh
npm ci && npm run lint && npm test && npm run build
npm run test:browser                  # against the local production build
```

After deploying, run the same browser suite against the live site:

```sh
LAB_TEST_URL=https://<your-site>.netlify.app npm run test:browser
```

## Rollback

In **Deploys**, open an earlier successful deploy and choose **Publish deploy**. Rollback is instant because each deploy is an immutable static snapshot.

## Status

As of 18 November 2026 the configuration has been checked locally (build output, SPA fallback behaviour equivalent through the Caddy container). The site has **not** been published to Netlify. The owner chose to keep it local for now.

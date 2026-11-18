# Implementation status

Last verified: **18 November 2026** on branch `upgrade/v2` (macOS arm64, Node 26, Docker, Python 3.15, R). This file is the progress record for [PLAN.md](../PLAN.md). An item is marked done only where code exists and a check below exercises it.

## Verification run

| Check | Command | Result |
| --- | --- | --- |
| Lint | `npm run lint` | clean |
| Unit / science fixtures | `npm test` | 80 / 80 pass |
| Production build | `npm run build` | passes; largest chunk 104 kB gzip (baseline: 475 kB single bundle) |
| Browser E2E + axe (WCAG 2.1 AA tags, both themes, 320 px) | `npm run test:browser` | 21 / 21 pass |
| Railway container | `sh scripts/smoke-container.sh` | image builds, `/builder` deep link served, 21 / 21 browser tests pass against the container |
| EX01–EX07 + Builder notebooks, Python and R parity | `python tests/engine-notebooks.py` | 13 notebooks validated and executed; scripts match JS fixtures |
| EX08–EX12 notebooks, Python and R | `python tests/additional-notebooks.py` | 5 notebooks executed; Python exact, R within 7 pooled SE |
| 16 Builder distribution families | `python tests/builder-input-notebook.py` | per-draw Python/R parity and notebook execution pass |
| No `Math.random`, `eval`, `new Function`, or runtime network calls in `src/` | grep | none found |

Notebook checks were run in a throwaway virtualenv with `scipy matplotlib nbformat nbclient ipykernel`.

## Phase summary

| Phase | State | Notes |
| --- | --- | --- |
| 0 Audit & baseline | done | [current-state-audit.md](current-state-audit.md), [baseline/](baseline/), ADR-001/002, CI workflow |
| 1 Design + Builder slice | done | STYLE tokens all present; question wizard, blank canvas, 3 templates, undo, save/reopen, worker run, notebook export |
| 2 Twelve examples | done | EX01–EX07 hardened (exact GBM, seeded Philox streams, Wilson/t intervals); EX08–EX12 added; all 12 export Python/R/ipynb |
| 3 Lessons, challenges, compare | mostly done | 12 lessons + 12 graded challenges, Compare (Welch/Newcombe, paired), Builder templates. Deep links from lessons into a *specific Builder node/metric* are not implemented |
| 4 Deployment & acceptance | partial | Configs verified locally; **not published** to Netlify or Railway (owner decision). Benchmarks cover Pi only. No teacher walkthrough or formal security review recorded |
| 5 Advanced extensions | not started | Planned as LATER |

## Open items

1. **Publish and smoke-test live deployments.** Blocked on the owner's decision to keep the app local. When ready, see [deployment/netlify.md](deployment/netlify.md) and [deployment/railway.md](deployment/railway.md), then run `LAB_TEST_URL=<url> npm run test:browser` against each.
2. **Benchmarks beyond Pi.** [benchmarks/](benchmarks/) only has `pi-browser.json`. Add Builder and the heavier domain models (random walk, scheduling, queue).
3. **Lesson → Builder node deep links.** Lessons currently link to labs, not to a specific Builder node or metric.
4. **Accessibility beyond automated checks.** axe passes and 320 px reflow is tested. A manual keyboard-only and screen-reader pass, plus explicit 400 % zoom testing, has not been recorded.
5. **Teacher walkthrough and security/privacy review.** Not yet done or documented.
6. **CI on GitHub.** The first run on `main` (`e94bd08`) passed lint, unit, build, browser and notebook jobs but failed the container smoke step (curl exit 56: the port proxy reset the connection before Caddy was listening). `scripts/smoke-container.sh` now retries on any error. This needs confirming on the next GitHub run.

## Environment notes

- Playwright needs `npx playwright install chromium` once per machine. Without it every browser test fails at launch. `LAB_CHROME_CHANNEL=chrome` uses an installed Chrome instead.
- `scripts/smoke-container.sh` requires a running Docker daemon.

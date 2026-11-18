# Implementation status

Last verified: **18 November 2026** on branch `upgrade/v2` (macOS arm64, Node 26, Docker, Python 3.15, R). This file is the progress record for [PLAN.md](../PLAN.md). An item is marked done only where code exists and a check below exercises it.

## Verification run

| Check | Command | Result |
| --- | --- | --- |
| Lint | `npm run lint` | clean |
| Unit / science fixtures | `npm test` | 82 / 82 pass |
| Production build | `npm run build` | passes; largest chunk 104 kB gzip (baseline: 475 kB single bundle) |
| Browser E2E + axe (WCAG 2.1 AA tags, both themes, 320 px) | `npm run test:browser` | 22 / 22 pass |
| Railway container | `sh scripts/smoke-container.sh` | image builds, `/builder` deep link served, 21 / 21 browser tests pass against the container |
| EX01–EX07 + Builder notebooks, Python and R parity | `python tests/engine-notebooks.py` | 13 notebooks validated and executed; scripts match JS fixtures |
| EX08–EX12 notebooks, Python and R | `python tests/additional-notebooks.py` | 5 notebooks executed; Python exact, R within 7 pooled SE |
| 16 Builder distribution families | `python tests/builder-input-notebook.py` | per-draw Python/R parity and notebook execution pass |
| Engine throughput, all presets | `node scripts/bench-engines.mjs` | [benchmarks/engines-node.md](benchmarks/engines-node.md) |
| No `Math.random`, `eval`, `new Function`, or runtime network calls in `src/` | grep | none found |

Notebook checks were run in a throwaway virtualenv with `scipy matplotlib nbformat nbclient ipykernel`.

## Phase summary

| Phase | State | Notes |
| --- | --- | --- |
| 0 Audit & baseline | done | [current-state-audit.md](current-state-audit.md), [baseline/](baseline/), ADR-001/002, CI workflow |
| 1 Design + Builder slice | done | STYLE tokens all present; question wizard, blank canvas, 3 templates, undo, save/reopen, worker run, notebook export |
| 2 Twelve examples | done | EX01–EX07 hardened (exact GBM, seeded Philox streams, Wilson/t intervals); EX08–EX12 added; all 12 export Python/R/ipynb |
| 3 Lessons, challenges, compare | done | 12 lessons + 12 graded challenges, Compare (Welch/Newcombe, paired), Builder templates. Builder lessons (L11, L12) deep-link to a template with the relevant node selected (`#/builder/template/<id>/<node>`) |
| 4 Deployment & acceptance | partial | Configs verified locally; **not published** to Netlify or Railway (owner decision). Engine benchmarks cover every preset; browser-worker benchmarks cover Pi only. No teacher walkthrough or formal security review recorded |
| 5 Advanced extensions | not started | Planned as LATER |

## Open items

1. **Publish and smoke-test live deployments.** Blocked on the owner's decision to keep the app local. When ready, see [deployment/netlify.md](deployment/netlify.md) and [deployment/railway.md](deployment/railway.md), then run `LAB_TEST_URL=<url> npm run test:browser` against each.
2. **Workload caps vs measured capacity.** [engines-node.md](benchmarks/engines-node.md) now measures all 12 presets and the Builder (`node scripts/bench-engines.mjs`). The shared domain limit (50,000 replications, 3,000,000 steps) caps cheap single-step models such as Integration and Monty Hall, which run at about 2 M replications/s. PLAN §4.6 asks for caps based on measured capacity, so per-model limits are worth revisiting. Browser worker overhead is measured for Pi only ([pi-browser.json](benchmarks/pi-browser.json)).
3. **Accessibility beyond automated checks.** axe passes and 320 px reflow is tested. A manual keyboard-only and screen-reader pass, plus explicit 400 % zoom testing, has not been recorded.
4. **Teacher walkthrough and security/privacy review.** Not yet done or documented.
5. **CI on GitHub.** The first run on `main` (`e94bd08`) passed lint, unit, build, browser and notebook jobs but failed the container smoke step (curl exit 56: the port proxy reset the connection before Caddy was listening). `scripts/smoke-container.sh` now retries on any error. This needs confirming on the next GitHub run.

## Environment notes

- Playwright needs `npx playwright install chromium` once per machine. Without it every browser test fails at launch. `LAB_CHROME_CHANNEL=chrome` uses an installed Chrome instead.
- `scripts/smoke-container.sh` requires a running Docker daemon.

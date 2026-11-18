# Baseline at d69ef6c

Captured on 18 November 2026 before modifying the original application. The npm lock resolves React 19 and Vite 8. Offline npm install and production build passed. The entry JS was 1,446.96 kB minified (475.29 kB gzip). ESLint reported one unused useEffect import in StockPrediction. The repository had no test script, CI workflow, host configuration, project storage or separate license file.

React state in App selects one of eight pages and unmounts the previous page. Six labs draw fixed-resolution 2D canvases. Stock uses Recharts. Sliders trigger full main-thread recalculation. All seven draw from Math.random. Reloading or navigating away loses the run. Controls, equations and Python/R generators live in each page. The shared Prism component copies the displayed code. The dark stylesheet loads two external fonts. The fixed sidebar and minimum grid column widths crowd the phone viewport.

## Preservation fixtures

Each [baseline](./baseline/) EX number has an original desktop capture at 1366 × 840, mobile capture at 390 × 844, and both code snippets extracted at the original defaults. Dark was the only original theme. Random outcomes in captures illustrate the original scene and cannot serve as replay vectors.

| ID | Verified control defaults and scene | Scientific limitations found in source |
| --- | --- | --- |
| B01 / EX01 | 1,000 darts, square canvas, circle and inside/outside colors | Four times the hit rate is correct. No interval or seed. |
| B02 / EX02 | 1,000 points, sine curve with hits below it on [0,π] | Correct hit-or-miss rectangle for this nonnegative example only. |
| B03 / EX03 | 100 games, stay/switch convergence curves | Host excludes chosen and winning door. Strategy wins in a game are complementary. No interval. |
| B04 / EX04 | 5 walkers, 100 steps, four cardinal directions | Title conflates lattice walk with Brownian motion. Square root of step count is RMS displacement. |
| B05 / EX05 | Price 100, drift 0.05, volatility 0.2, 252 days, 5 paths | Browser uses Euler, scripts use exact GBM. Empty or unchecked numeric input can create invalid dimensions. |
| B06 / EX06 | 5,000 projects, mean procurement 30 days, construction 60, inspection 10, deadline 100 | Each sequential duration is a normal draw clipped at zero. 50-bin histogram, target and 120-day probabilities. |
| B07 / EX07 | 2,000 months, 5% daily breakdown, 2,400-unit target | 30 independent days per month, 100 units/day scaled by clipped labor/material fractions. Continuous equivalent output. |
| B08 | Sliders and stock numeric controls verified | Numeric input converted blank to zero. |
| B09 | Canvas scenes and Recharts paths verified | All samples drawn or processed synchronously. |
| B10 | KaTeX on several pages | README claim of formulas for every model is broader than implemented coverage. |
| B11 | Python and R snippets present in all seven modules | Current parameters embedded. Cross-language seeded replay missing. |
| B12 | Sidebar and theory-first entry verified | Visiting another screen destroys state. |
| B13 | React/Vite, CSS, Recharts, Canvas, KaTeX, Prism and Lucide verified | No automated numerical or browser regression coverage. |

No existing tests or deployment records were available to establish performance, accessibility or host acceptance.

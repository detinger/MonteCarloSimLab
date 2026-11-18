# Monte Carlo Simulation Lab

A local-first learning workspace for building stochastic models, running seeded experiments and interpreting sampling uncertainty. It includes 12 standalone simulations, 12 lessons, 12 graded challenges and a question-driven Simulation Builder.

## Start the lab

Use Node.js 22.12 or newer and npm. The development server prints its local URL.

```sh
npm ci
npm run dev
```

Open **Simulation Lab** to choose a domain experiment, or **Simulation Builder** to define inputs, an output formula and a decision threshold. The default budget model is ready to run. The **Analysis** and **Compare** views can use a saved Builder project. **Distribution Studio** explores 16 input families with repeatable draws and theoretical bin probabilities. A link such as `#/builder/template/budget/event` opens a new copy of a Builder template (`budget`, `revenue`, `rare`) with that node selected; the Builder lessons use these links.

## Experiments

| Domain | Examples |
| --- | --- |
| Probability and numerical methods | Estimating Pi, Monte Carlo Integration, Monty Hall, Coin & Dice, Birthday Paradox |
| Stochastic processes | 2D Random Walk, Stock Price Prediction (illustrative GBM), Queueing & Service Operations |
| Operations and engineering | Project Scheduling & Risk, Manufacturing Quality Control, System Reliability, Inventory & Reorder Planning |

Each experiment has model assumptions, adjustable parameters, a visual result and export controls. Changes to the seed, model and workload belong in the experiment record. A confidence interval describes sampling uncertainty conditional on those settings. Scenario percentiles describe variation among the modeled outcomes.

## Saving and exporting

Browser storage is specific to the browser profile and origin. Download a project or run JSON file to transfer work between devices or deployments. Builder projects save locally and appear in Saved projects. The lab pages support saving and replaying completed runs. Lesson and challenge progress is stored on the device.

Python, R and Jupyter notebooks are generated from the chosen experiment. Upload an exported `.ipynb` through **File → Upload notebook** in Colab, or open it in Jupyter. Notebook execution requires a Python kernel and the dependencies listed in its cells. Each exporter identifies its random number method.

## Verification

```sh
npm run lint
npm test
npm run build
npx playwright install chromium
npm run test:browser
```

The browser tests serve the production build. Set `LAB_TEST_URL` to run them against an existing deployment. `LAB_CHROME_CHANNEL=chrome` selects an installed Chrome browser. The notebook checks require Node, Python with scipy, matplotlib, nbformat, nbclient and ipykernel, and Rscript.

```sh
python tests/engine-notebooks.py
python tests/additional-notebooks.py
python tests/builder-input-notebook.py
```

## Hosting

Netlify builds with npm and publishes `dist` using the repository configuration. Railway can use the multi-stage Dockerfile. Caddy serves the same static assets, honors the supplied PORT, and falls back to the SPA on deep links. No backend credentials are needed.

```sh
docker build -t simulation-lab .
docker run --rm -p 3000:3000 -e PORT=3000 simulation-lab
```

The [baseline audit](docs/current-state-audit.md) records the original seven labs and their limitations. The [implementation plan](PLAN.md) and [style specification](STYLE.md) describe the broader release targets.

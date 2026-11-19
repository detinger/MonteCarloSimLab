# Monte Carlo Simulation Lab

A local-first learning workspace for building stochastic models, running seeded experiments and interpreting sampling uncertainty. It includes 12 standalone simulations, 12 lessons, 12 graded challenges, a question-driven Simulation Builder with 13 ready-to-run examples and 10 what-if challenges, and two tools for choosing and exploring input distributions.

## Start the lab

Use Node.js 22.12 or newer and npm. The development server prints its local URL.

```sh
npm ci
npm run dev
```

The sidebar has three sections.

| Section | Pages |
| --- | --- |
| Learning | Theory & Concepts, Lessons, Examples (the 12 standalone simulations), Challenges |
| Workspace | Simulation Builder, Simulation Examples, Simulation Challenges |
| Distributions | Distribution Studio, Distribution Helper |

## Simulation Builder

Define uncertain inputs, combine them with a formula and estimate the probability that the output crosses a threshold. The default budget model is ready to run.

- **Diagram** shows the model as connected nodes; click a node to edit it in a popup.
- **Table** lays the whole model out in four steps: question, inputs, calculation and event.
- **Validate** turns green when the model is ready and red with an issue count when it is not; click it for the list. **Clear** empties the model, and Undo restores it.
- **Experiment results** has Overview, Histogram, Cumulative frequency, Samples, Convergence and Sensitivity tabs. The histogram covers every replication and marks the mean and the event threshold.

**Simulation Examples** opens ready-made models (budgets, revenue, risk and IT operations) in the Builder. **Simulation Challenges** turns ten of them into exercises: make the described change, re-run and check the probability.

## Distributions

The Builder and Studio support 22 input families: Constant, Uniform, Discrete uniform, Bernoulli, Binomial, Geometric, Negative binomial, Hypergeometric, Poisson, Categorical, Empirical, Normal, Truncated normal, Logistic, Cauchy, Minimum extreme, Lognormal, Triangular, Beta, Gamma, Weibull and Exponential. Cauchy has no mean; its checks use the median instead.

**Distribution Studio** draws repeatable samples from one family and compares them with the theoretical density or probabilities. A link such as `#/distributions/gamma` opens it on that family. **Add input to Builder** sends the family and its parameters to the current model.

**Distribution Helper** is a decision tree on a pan-and-zoom canvas. Answer questions about your data (discrete or continuous, symmetric or skewed, where the outliers lie) to reach a suggested family. Each result can be opened in the Studio or added to the Builder.

## Experiments

| Domain | Examples |
| --- | --- |
| Probability and numerical methods | Estimating Pi, Monte Carlo Integration, Monty Hall, Coin & Dice, Birthday Paradox |
| Stochastic processes | 2D Random Walk, Stock Price Prediction (illustrative GBM), Queueing & Service Operations |
| Operations and engineering | Project Scheduling & Risk, Manufacturing Quality Control, System Reliability, Inventory & Reorder Planning |

Each experiment has model assumptions, adjustable parameters, a visual result and export controls. Changes to the seed, model and workload belong in the experiment record. A confidence interval describes sampling uncertainty conditional on those settings. Scenario percentiles describe variation among the modeled outcomes.

## Saving and exporting

Browser storage is specific to the browser profile and origin. Download a project or run JSON file to transfer work between devices or deployments. Builder projects save locally and appear under **Open** in the Builder and in Recent Projects on the home page. The lab pages support saving and replaying completed runs. Lesson and challenge progress is stored on the device.

The Builder's **Export** dialog offers code (notebook, Python, R), the project file, and run data (sample table, convergence chart, reproducible bundle). Python, R and Jupyter notebooks are generated from the chosen model and reproduce the browser's draws for every input family. Upload an exported `.ipynb` through **File → Upload notebook** in Colab, or open it in Jupyter. Notebook execution requires a Python kernel and the dependencies listed in its cells. Each exporter identifies its random number method.

## Verification

```sh
npm run lint
npm test
npm run build
npx playwright install chromium
npm run test:browser
```

The browser tests serve the production build. Set `LAB_TEST_URL` to run them against an existing deployment. `LAB_CHROME_CHANNEL=chrome` selects an installed Chrome browser. The notebook checks require Node, Python with scipy, matplotlib, nbformat, nbclient and ipykernel, and Rscript. `builder-input-notebook.py` compares the browser, Python and R draws for every input family. `example-exports.mjs` runs every Simulation Examples model through all seven Builder exports, compares the Python and R results with the browser and checks that each analysis figure is produced.

```sh
python tests/engine-notebooks.py
python tests/additional-notebooks.py
python tests/builder-input-notebook.py
PYTHON=python node tests/example-exports.mjs
```

## Hosting

Netlify builds with npm and publishes `dist` using the repository configuration. Railway can use the multi-stage Dockerfile. Caddy serves the same static assets, honors the supplied PORT, and falls back to the SPA on deep links. No backend credentials are needed.

```sh
docker build -t simulation-lab .
docker run --rm -p 3000:3000 -e PORT=3000 simulation-lab
```

The [baseline audit](docs/current-state-audit.md) records the original seven labs and their limitations. The [implementation plan](PLAN.md) and [style specification](STYLE.md) describe the broader release targets.

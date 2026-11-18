# Builder input distributions

Distribution Studio and Simulation Builder share the following parameter order. Builder treats each input as an independent numeric variable. Reusing its identifier in a formula reuses its sampled value within the replication.

| Family | Parameters in order | Meaning |
| --- | --- | --- |
| Constant | Fixed value | Same finite value in every replication |
| Uniform | Minimum, maximum | Continuous uniform on a finite interval with positive width |
| Discrete uniform | Minimum integer, maximum integer | Both endpoints included, up to 10,000 outcomes |
| Bernoulli | Success probability | Outcome 1 on success and 0 on failure |
| Binomial | Trials, success probability | Count of successes in 0–100 independent trials |
| Categorical | Comma-separated probabilities | Numeric categories 1 through the list length. Entries must be nonnegative and sum to one within 1e-12 |
| Normal | Mean, standard deviation | Positive standard deviation |
| Truncated normal | Parent mean, parent standard deviation, lower bound, upper bound | Normal law conditioned on the interval. Parent mass in the interval must be at least 1e-10 |
| Lognormal | Log-space mean, log-space standard deviation | Exponential of the specified normal variate |
| Triangular | Minimum, mode, maximum | Mode may equal either endpoint. The range must be positive |
| Beta | Shape α, shape β | Fraction on the unit interval, with positive shape parameters |
| Gamma | Shape, scale | Positive parameters. The expected value is shape times scale |
| Weibull | Shape, scale | Positive parameters. The scale has the same units as the modeled variable |
| Exponential | Rate | Positive rate per output unit. The mean is its reciprocal |
| Poisson | Mean count | Mean between 0 and 100, including the deterministic zero-count case |
| Empirical | Comma-separated observations | Uniformly resamples at most 256 finite observations. Repeated values retain multiplicity |

The version 1 Builder project retains editable parameters in slots `a`, `b`, `c` and, for truncation, `d`. The compiler converts list parameters in slot `a` to numeric arrays and scalar parameters to numbers. Runtime validation prevents an invalid draft from starting a run. Categorical inputs accept up to 256 probabilities. The Studio handoff passes the selected family ID and its ordered editable fields to the same validator.

Uniform, Bernoulli, normal, triangular and constant inputs preserve the original engine transforms and named streams. Other families draw an open-interval probability from the first Philox word as `(word + 0.5) / 2^32` and apply the family quantile. For categorical and empirical inputs, quantile boundaries belong to the lower category. Discrete uniform uses equal-width bins with a right-open upper endpoint. Identifiers select streams. Editing the display label preserves the draws.

The Python and R exports use the same Philox words. Python uses SciPy for inverse CDFs and R uses the base stats library. Floating-point inverse CDFs can differ across implementations, particularly in the tails. The cross-language regression compares individual numeric draws, validates the notebook, executes its cells and checks its summary.

Run `node --test tests/builder-inputs.test.js` for validation, replay and parameter recovery. With Node, Rscript, Python, SciPy, Matplotlib, nbformat, nbclient and an ipykernel installed, run `python tests/builder-input-notebook.py` for portable export verification.

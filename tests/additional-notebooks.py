"""Execute EX08–EX12 notebooks and compare the exported observations with JS.
Run from the repository root with nbformat, nbclient, ipykernel and matplotlib.
"""
import csv
import io
import json
import math
import statistics
import subprocess
import sys
import tempfile
from pathlib import Path

import nbformat
from nbclient import NotebookClient

fixtures = subprocess.run(
    ["node", "--input-type=module", "-e", """
import {defaults, examples, experiment} from './src/domains/newExamples.js'
import {portable} from './src/domains/newExports.js'
const fixtures = Object.keys(examples).map(id => {
  const model = {...defaults(id), samples: 64, seed: 137}
  const runner = experiment(model)
  runner.step(model.samples)
  const scripts = portable(model)
  return {id, model, average: runner.result().mean, notebook: scripts.ipynb, python:scripts.py, r:scripts.R}
})
console.log(JSON.stringify(fixtures))
"""],
    check=True, text=True, capture_output=True,
)

for fixture in json.loads(fixtures.stdout):
    doc = nbformat.read(io.StringIO(fixture["notebook"]), as_version=4)
    nbformat.validate(doc)
    with tempfile.TemporaryDirectory() as directory:
        output = Path(directory)
        NotebookClient(doc, timeout=90, kernel_name="python3",
                       resources={"metadata": {"path": directory}}).execute()
        manifest = json.loads((output / "run-manifest.json").read_text())
        with (output / "replications.csv").open() as data:
            records = list(csv.DictReader(data))
        assert len(records) == fixture["model"]["samples"]
        assert manifest["parameters"]["seed"] == fixture["model"]["seed"]
        assert math.isclose(statistics.mean(float(row["value"]) for row in records),
                            fixture["average"], rel_tol=1e-11, abs_tol=1e-12)
        baseline = [float(row["value"]) for row in records]
        for runtime, extension, key in [(sys.executable, "py", "python"), ("Rscript", "R", "r")]:
            folder = output / key
            folder.mkdir()
            script = folder / ("experiment." + extension)
            script.write_text(fixture[key])
            subprocess.run([runtime, str(script)], cwd=folder, check=True, capture_output=True)
            with (folder / "replications.csv").open() as data:
                observed = [float(row["value"]) for row in csv.DictReader(data)]
            assert len(observed) == len(baseline)
            if key == "python":
                assert math.isclose(statistics.mean(observed), fixture["average"], rel_tol=1e-11, abs_tol=1e-12)
            else:
                pooled_se = math.sqrt((statistics.variance(observed) + statistics.variance(baseline)) / len(baseline))
                assert abs(statistics.mean(observed) - fixture["average"]) <= 7 * pooled_se + 1e-10
    print(f"{fixture['id']} validated and executed", flush=True)

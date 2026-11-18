"""Execute the Builder family notebook and compare individual JS, Python and R draws."""
import json
import math
import subprocess
import sys
import tempfile
from pathlib import Path

import nbformat
from nbclient import NotebookClient

repo = Path(__file__).resolve().parents[1]
with tempfile.TemporaryDirectory() as work:
    root = Path(work)
    subprocess.run(["node", "tests/builder-input-ports.mjs", work], cwd=repo, check=True)
    result = json.loads((root / "browser.json").read_text())
    outputs = subprocess.check_output([sys.executable, "families.py"], cwd=root, text=True)
    python = json.loads(next(row[3:] for row in outputs.splitlines() if row.startswith("QA ")))
    outputs = subprocess.check_output(["Rscript", "families.R"], cwd=root, text=True)
    r = {}
    for row in outputs.splitlines():
        if row.startswith("QA "):
            _, name, *draws = row.split()
            r[name] = list(map(float, draws))
    for name, expected in result["expected"].items():
        for runtime in (python, r):
            assert len(expected) == len(runtime[name])
            for actual, wanted in zip(runtime[name], expected):
                assert math.isclose(actual, wanted, abs_tol=3e-7, rel_tol=3e-7), (name, actual, wanted)
    doc = nbformat.read(root / "families.ipynb", as_version=4)
    nbformat.validate(doc)
    NotebookClient(doc, timeout=90, kernel_name="python3",
                   resources={"metadata": {"path": work}}).execute()
    summary = json.loads((root / "run-manifest.json").read_text())["summary"]
    assert math.isclose(summary["mean"], result["mean"], rel_tol=3e-7, abs_tol=3e-7)
    print("All 16 distribution families passed per-draw Python/R parity and notebook execution.")

"""Check Pi, Builder and EX02–EX07 scripts and execute their offline notebooks.

Run with Python 3, scipy, matplotlib, nbformat, nbclient, ipykernel, Node and Rscript.
"""
import json
import math
import subprocess
import sys
import tempfile
from pathlib import Path

import nbformat
from nbclient import NotebookClient

root = Path(__file__).resolve().parents[1]
with tempfile.TemporaryDirectory() as tmp:
    work = Path(tmp)
    subprocess.run(["node", "tests/engine-ports.mjs", tmp], cwd=root, check=True)
    for book in sorted(work.glob("*.ipynb")):
        expected = json.loads(book.with_suffix(".json").read_text())
        for cmd, suffix in [(sys.executable, ".py"), ("Rscript", ".R")]:
            out = subprocess.check_output([cmd, str(book.with_suffix(suffix))], text=True, cwd=work)
            tag, mean, hits = out.strip().splitlines()[-1].split()
            assert tag == "QA" and int(hits) == expected["hits"]
            assert math.isclose(float(mean), expected["mean"], rel_tol=1e-8 if book.stem=="schedule-network" else 1e-11, abs_tol=1e-12)
        doc = nbformat.read(book, as_version=4)
        nbformat.validate(doc)
        dest = work / book.stem
        dest.mkdir()
        NotebookClient(doc, timeout=120, kernel_name="python3",
                       resources={"metadata": {"path": str(dest)}}).execute()
        summary = json.loads((dest / "run-manifest.json").read_text())["summary"]
        assert summary["hits"] == expected["hits"]
        for key in ["meanCI", "probabilityCI"]:
            for actual, want in zip(summary[key], expected[key]):
                assert math.isclose(actual, want, rel_tol=2e-6, abs_tol=2e-6)
        assert (dest / "replications.csv").exists()
        print(f"{book.stem} passed script parity, notebook validation and kernel execution", flush=True)

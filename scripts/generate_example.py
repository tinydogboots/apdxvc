#!/usr/bin/env python3
"""
Generate a small synthetic example dataset to verify the setup.

Creates data/example.bytes and data/example_metadata.tsv, then
adds an "Example (synthetic)" entry to data/projector_config.json.

Run from the repo root:
    python scripts/generate_example.py
"""

import json
import os
import sys

import numpy as np


N_POINTS = 200
N_DIMS = 32
CLUSTERS = 5
SEED = 42


def main() -> None:
    rng = np.random.default_rng(SEED)

    centers = rng.standard_normal((CLUSTERS, N_DIMS)).astype(np.float32) * 5
    labels = []
    vectors = []
    for i in range(N_POINTS):
        cluster = i % CLUSTERS
        vec = centers[cluster] + rng.standard_normal(N_DIMS).astype(np.float32)
        vectors.append(vec)
        labels.append(f"cluster_{cluster}_point_{i}")

    vectors = np.array(vectors, dtype=np.float32)

    os.makedirs("data", exist_ok=True)

    bytes_path = "data/example.bytes"
    meta_path = "data/example_metadata.tsv"

    vectors.astype("<f4").tofile(bytes_path)
    with open(meta_path, "w") as f:
        f.write("label\tcluster\n")
        for i, lbl in enumerate(labels):
            f.write(f"{lbl}\t{i % CLUSTERS}\n")

    config_path = "data/projector_config.json"
    if os.path.exists(config_path):
        with open(config_path) as f:
            config = json.load(f)
    else:
        config = {"embeddings": [], "modelCheckpointPath": "Custom embeddings"}

    entry = {
        "tensorName": "Example (synthetic)",
        "tensorShape": list(vectors.shape),
        "tensorPath": bytes_path,
        "metadataPath": meta_path,
    }
    config["embeddings"] = [e for e in config["embeddings"] if e.get("tensorName") != entry["tensorName"]]
    config["embeddings"].insert(0, entry)

    with open(config_path, "w") as f:
        json.dump(config, f, indent=2)

    print(f"Generated {N_POINTS} points × {N_DIMS} dims across {CLUSTERS} clusters.")
    print(f"  Vectors  : {bytes_path}")
    print(f"  Metadata : {meta_path}")
    print(f"  Config   : {config_path}")
    print("\nNow run: python scripts/serve.py  →  open http://localhost:8000")


if __name__ == "__main__":
    main()

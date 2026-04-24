#!/usr/bin/env python3
"""
Convert embeddings to the format expected by the Embedding Projector.

Usage examples:
  # From a numpy .npy file:
  python scripts/prepare_data.py \
      --vectors path/to/vectors.npy \
      --labels  path/to/labels.txt \
      --name    "My Model" \
      --out-dir data/

  # From a CSV (rows = points, columns = dimensions, optional header):
  python scripts/prepare_data.py \
      --csv     path/to/embeddings.csv \
      --name    "My Model" \
      --out-dir data/

Output writes two files to --out-dir:
  embeddings.bytes   raw float32 little-endian tensor
  metadata.tsv       tab-separated label file
and updates data/projector_config.json.
"""

import argparse
import json
import os
import struct
import sys

import numpy as np


def save_bytes(vectors: np.ndarray, path: str) -> None:
    vectors.astype("<f4").tofile(path)


def save_metadata(labels, columns: list[str] | None, path: str) -> None:
    with open(path, "w", encoding="utf-8") as f:
        if columns:
            f.write("\t".join(columns) + "\n")
        for row in labels:
            if isinstance(row, (list, tuple)):
                f.write("\t".join(str(v) for v in row) + "\n")
            else:
                f.write(str(row) + "\n")


def update_config(config_path: str, name: str, shape: list, vectors_rel: str, meta_rel: str) -> None:
    if os.path.exists(config_path):
        with open(config_path) as f:
            config = json.load(f)
    else:
        config = {"embeddings": [], "modelCheckpointPath": "Custom embeddings"}

    # Replace existing entry with same name, or append
    entry = {
        "tensorName": name,
        "tensorShape": shape,
        "tensorPath": vectors_rel,
        "metadataPath": meta_rel,
    }
    config["embeddings"] = [e for e in config["embeddings"] if e.get("tensorName") != name]
    config["embeddings"].append(entry)

    with open(config_path, "w") as f:
        json.dump(config, f, indent=2)
    print(f"Updated {config_path}")


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    src = p.add_mutually_exclusive_group(required=True)
    src.add_argument("--vectors", help=".npy file of shape [N, D]")
    src.add_argument("--csv", help="CSV file, rows=points, cols=dims (first col may be label)")

    p.add_argument("--labels", help="Text file with one label per line (for --vectors)")
    p.add_argument("--name", default="My Embeddings", help="Display name in the projector")
    p.add_argument("--out-dir", default="data", help="Output directory (default: data/)")
    p.add_argument("--config", default="data/projector_config.json", help="Config JSON to update")
    p.add_argument("--filename", default="embeddings", help="Base filename for output files")
    args = p.parse_args()

    os.makedirs(args.out_dir, exist_ok=True)

    if args.vectors:
        vectors = np.load(args.vectors)
        if vectors.ndim != 2:
            sys.exit(f"Expected 2-D array, got shape {vectors.shape}")
        labels = None
        columns = None
        if args.labels:
            with open(args.labels) as f:
                labels = [line.rstrip("\n") for line in f]
            if len(labels) != vectors.shape[0]:
                sys.exit(f"Label count {len(labels)} != vector count {vectors.shape[0]}")
    else:  # --csv
        import csv
        rows = []
        header = None
        label_col = None
        with open(args.csv, newline="", encoding="utf-8") as f:
            reader = csv.reader(f)
            first = next(reader)
            # Detect header: if first cell is non-numeric, treat first row as header
            try:
                float(first[0])
                rows.append(first)
            except ValueError:
                header = first
                # If the header has one more col than would be numeric, first col is label
                label_col = 0
            for row in reader:
                rows.append(row)

        if label_col is not None:
            labels = [r[label_col] for r in rows]
            vectors = np.array([[float(v) for v in r[1:]] for r in rows], dtype=np.float32)
            columns = header[1:] if header else None
        else:
            labels = None
            vectors = np.array([[float(v) for v in r] for r in rows], dtype=np.float32)
            columns = header

    bytes_file = os.path.join(args.out_dir, f"{args.filename}.bytes")
    meta_file = os.path.join(args.out_dir, f"{args.filename}_metadata.tsv")

    save_bytes(vectors, bytes_file)
    print(f"Saved {vectors.shape[0]} vectors ({vectors.shape[1]}d) → {bytes_file}")

    if labels is not None:
        save_metadata(labels, columns, meta_file)
        print(f"Saved metadata → {meta_file}")
    else:
        meta_file = None

    # Paths relative to repo root for the config
    bytes_rel = os.path.relpath(bytes_file)
    meta_rel = os.path.relpath(meta_file) if meta_file else None
    update_config(
        args.config,
        args.name,
        list(vectors.shape),
        bytes_rel,
        meta_rel,
    )


if __name__ == "__main__":
    main()

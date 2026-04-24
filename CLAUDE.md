# Embedding Projector — Custom Setup

Interactive 3D visualization of high-dimensional embeddings, based on
[tensorflow/embedding-projector-standalone](https://github.com/tensorflow/embedding-projector-standalone).

## Quick start

```bash
pip install -r requirements.txt

# Optional: generate a synthetic 200-point example to verify the setup
python scripts/generate_example.py

# Start the local server (serves from repo root on port 8000)
python scripts/serve.py
# → open http://localhost:8000
```

## Adding your own embeddings

### Option A — from a NumPy array

```bash
python scripts/prepare_data.py \
    --vectors path/to/vectors.npy \   # shape [N, D], float32 or float64
    --labels  path/to/labels.txt \    # one label per line
    --name    "My Model v1" \
    --out-dir data/
```

### Option B — from a CSV

First column is treated as the label if it is non-numeric; remaining columns
are the embedding dimensions.

```bash
python scripts/prepare_data.py \
    --csv  path/to/embeddings.csv \
    --name "My Model v1" \
    --out-dir data/
```

Both options write `data/<filename>.bytes` and `data/<filename>_metadata.tsv`,
then update `data/projector_config.json` automatically.

### Option C — manual / programmatic

```python
import numpy as np, json

vectors = np.random.randn(500, 128).astype(np.float32)
vectors.astype("<f4").tofile("data/my_vectors.bytes")

with open("data/my_metadata.tsv", "w") as f:
    f.write("label\n")
    for i in range(len(vectors)):
        f.write(f"point_{i}\n")
```

Then add an entry to `data/projector_config.json`:

```json
{
  "tensorName": "My Model",
  "tensorShape": [500, 128],
  "tensorPath": "data/my_vectors.bytes",
  "metadataPath": "data/my_metadata.tsv"
}
```

## File format reference

| File | Format |
|------|--------|
| `.bytes` | Raw little-endian `float32` values, row-major `[N × D]` |
| metadata `.tsv` | Tab-separated; optional header row; first col is the label used in the UI |
| `projector_config.json` | JSON array of embedding entries (see `data/projector_config.json`) |

### Optional config fields per embedding

```json
{
  "tensorName": "...",
  "tensorShape": [N, D],
  "tensorPath": "data/vectors.bytes",
  "metadataPath": "data/metadata.tsv",
  "bookmarksPath": "data/bookmarks.txt",   // optional saved camera views
  "sprite": {                               // optional thumbnail strip
    "imagePath": "data/sprites.png",
    "singleImageDim": [32, 32]
  }
}
```

## Switching between datasets

- **Custom data** (default): `http://localhost:8000`
- **Google demo datasets**: `http://localhost:8000?config=oss_data/oss_demo_projector_config.json`
- **Any other config**: `http://localhost:8000?config=<relative-path-to-config.json>`

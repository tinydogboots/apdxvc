"""
Convert audit XLSX → data/kumu_blueprint.json

Expected workbook layout
────────────────────────
Sheet "Tasks" — one row per task node:
  Columns (exact names, case-insensitive):
    id, label, tier, category, subheading, source_sentence,
    lead, track, recommendation_only, notes

Sheet "Connections" — one row per connection:
  Columns (exact names, case-insensitive):
    from, to, label, type, status

tier values     : foundational | intermediate | advanced
lead values     : consultant | client | third_party | tbd
type values     : dependency | synergy
status values   : confirmed | pending
recommendation_only : any truthy value ("yes", "true", "x", "1", etc.)

Usage
─────
    python scripts/xlsx_to_json.py path/to/audit.xlsx
    python scripts/xlsx_to_json.py path/to/audit.xlsx --out data/kumu_blueprint.json
"""

import argparse
import json
import sys
from pathlib import Path

try:
    import openpyxl
except ImportError:
    sys.exit("openpyxl is required — run: pip install openpyxl")


TRUTHY = {"yes", "y", "true", "t", "x", "1", "✓", "✔"}


def _norm(s: str) -> str:
    return s.strip().lower().replace("-", "_").replace(" ", "_")


def _cell(row: dict, key: str, default="") -> str:
    v = row.get(key, default)
    return str(v).strip() if v is not None else default


def _bool(row: dict, key: str) -> bool:
    raw = _cell(row, key).lower()
    return raw in TRUTHY


def sheet_to_dicts(ws) -> list[dict]:
    headers = [_norm(str(c.value or "")) for c in next(ws.iter_rows(min_row=1, max_row=1))]
    rows = []
    for row in ws.iter_rows(min_row=2, values_only=True):
        if all(v is None for v in row):
            continue  # skip blank rows
        rows.append(dict(zip(headers, row)))
    return rows


def convert(xlsx_path: Path, out_path: Path) -> None:
    wb = openpyxl.load_workbook(xlsx_path, data_only=True)

    # ── Locate sheets (case-insensitive) ─────────────────────────────────────
    sheet_map = {s.title.lower(): s for s in wb.worksheets}
    task_ws = sheet_map.get("tasks") or sheet_map.get("task") or wb.worksheets[0]
    conn_ws = (
        sheet_map.get("connections")
        or sheet_map.get("connection")
        or sheet_map.get("links")
        or (wb.worksheets[1] if len(wb.worksheets) > 1 else None)
    )

    task_rows = sheet_to_dicts(task_ws)
    conn_rows = sheet_to_dicts(conn_ws) if conn_ws else []

    # ── Build elements ────────────────────────────────────────────────────────
    elements = []
    seen_ids = set()
    for r in task_rows:
        task_id = _cell(r, "id")
        if not task_id:
            print(f"  ⚠  Row missing id — skipping: {r}", file=sys.stderr)
            continue
        if task_id in seen_ids:
            print(f"  ⚠  Duplicate id '{task_id}' — skipping", file=sys.stderr)
            continue
        seen_ids.add(task_id)

        tier = _cell(r, "tier", "foundational")
        lead_raw = _norm(_cell(r, "lead", "tbd"))
        # normalise "third-party" → "third_party" etc.
        lead = lead_raw if lead_raw in ("consultant", "client", "third_party", "tbd") else "tbd"

        elements.append({
            "id": task_id,
            "label": _cell(r, "label", task_id),
            "attributes": {
                "tier":                tier,
                "category":            _cell(r, "category"),
                "subheading":          _cell(r, "subheading"),
                "source_sentence":     _cell(r, "source_sentence"),
                "lead":                lead,
                "track":               _cell(r, "track"),
                "recommendation_only": _bool(r, "recommendation_only"),
                "notes":               _cell(r, "notes"),
            },
        })

    # ── Build connections ─────────────────────────────────────────────────────
    connections = []
    for r in conn_rows:
        from_id = _cell(r, "from")
        to_id   = _cell(r, "to")
        if not from_id or not to_id:
            continue
        conn_type = _norm(_cell(r, "type", "dependency"))
        if conn_type not in ("dependency", "synergy"):
            conn_type = "dependency"
        status = _norm(_cell(r, "status", "confirmed"))
        if status not in ("confirmed", "pending"):
            status = "confirmed"

        connections.append({
            "from":  from_id,
            "to":    to_id,
            "label": _cell(r, "label"),
            "attributes": {
                "type":   conn_type,
                "status": status,
            },
        })

    # ── Write output ──────────────────────────────────────────────────────────
    out_path.parent.mkdir(parents=True, exist_ok=True)
    payload = {"elements": elements, "connections": connections}
    out_path.write_text(json.dumps(payload, indent=2, ensure_ascii=False))

    print(
        f"  ✓  {len(elements)} tasks, {len(connections)} connections"
        f" → {out_path}"
    )


def main() -> None:
    parser = argparse.ArgumentParser(description="Convert audit XLSX to kumu_blueprint.json")
    parser.add_argument("xlsx", type=Path, help="Path to the .xlsx file")
    parser.add_argument(
        "--out",
        type=Path,
        default=Path("data/kumu_blueprint.json"),
        help="Output JSON path (default: data/kumu_blueprint.json)",
    )
    args = parser.parse_args()

    if not args.xlsx.exists():
        sys.exit(f"File not found: {args.xlsx}")

    print(f"Converting {args.xlsx} …")
    convert(args.xlsx, args.out)


if __name__ == "__main__":
    main()

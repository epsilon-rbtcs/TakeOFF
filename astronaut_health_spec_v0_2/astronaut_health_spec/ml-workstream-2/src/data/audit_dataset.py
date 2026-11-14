"""Non-destructive structural and quality audit for the PhysioNet QoL_Stress v1.0.0 dataset.

Expected project layout:
ml-workstream-2/
  data/raw/qol_stress-a-multimodal-dataset-of-physiological-and-self-reported-stress-responses-1.0.0/
    data/*.csv
    SHA256SUMS.txt

Run from the ml-workstream-2 project root:
  python src/data/audit_dataset.py --dataset-root "data/raw/qol_stress-a-multimodal-dataset-of-physiological-and-self-reported-stress-responses-1.0.0"

The script only reads original files and writes reports under reports/.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
from pathlib import Path
from typing import Any

import pandas as pd

EXPECTED_COLLECTIONS = [
    "ecg.csv",
    "eda.csv",
    "fitbit_heart_rate_per_minute.csv",
    "fitbit_heart_rate_per_second.csv",
    "fitbit_heart_rate_summary.csv",
    "participants.csv",
    "pss_14.csv",
    "stai.csv",
]
ID_CANDIDATES = ["username", "participant_id", "subject_id", "participant"]


def sha256_file(path: Path, chunk_size: int = 1024 * 1024) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        while chunk := handle.read(chunk_size):
            digest.update(chunk)
    return digest.hexdigest()


def parse_checksum_file(checksum_path: Path, dataset_root: Path) -> list[dict[str, Any]]:
    """Parse conventional sha256sum lines; report unsupported lines instead of guessing."""
    results: list[dict[str, Any]] = []
    if not checksum_path.exists():
        return results
    pattern = re.compile(r"^([A-Fa-f0-9]{64})\s+[* ]?(.*)$")
    for raw_line in checksum_path.read_text(encoding="utf-8", errors="replace").splitlines():
        line = raw_line.strip()
        if not line:
            continue
        match = pattern.match(line)
        if not match:
            results.append({"entry": line, "status": "UNPARSED_LINE"})
            continue
        expected, rel_name = match.groups()
        candidate = (dataset_root / rel_name).resolve()
        try:
            candidate.relative_to(dataset_root.resolve())
        except ValueError:
            results.append({"file": rel_name, "status": "PATH_OUTSIDE_DATASET"})
            continue
        if not candidate.is_file():
            results.append({"file": rel_name, "status": "MISSING_FILE", "expected_sha256": expected})
            continue
        actual = sha256_file(candidate)
        results.append({
            "file": rel_name,
            "expected_sha256": expected,
            "actual_sha256": actual,
            "status": "OK" if actual.lower() == expected.lower() else "HASH_MISMATCH",
        })
    return results


def load_csv(path: Path) -> pd.DataFrame:
    # Keep identifiers as strings; don't let pandas reinterpret pseudonymous hashes.
    return pd.read_csv(path, dtype={"username": "string"}, low_memory=False)


def find_id_column(df: pd.DataFrame) -> str | None:
    for name in ID_CANDIDATES:
        if name in df.columns:
            return name
    return None


def safe_json(value: Any) -> Any:
    if pd.isna(value):
        return None
    if hasattr(value, "item"):
        return value.item()
    return str(value)


def audit_one(path: Path) -> tuple[dict[str, Any], pd.DataFrame]:
    df = load_csv(path)
    id_col = find_id_column(df)
    numeric = df.select_dtypes(include="number")
    schema = []
    for col in df.columns:
        schema.append({
            "column": col,
            "dtype": str(df[col].dtype),
            "non_null": int(df[col].notna().sum()),
            "null": int(df[col].isna().sum()),
            "null_pct": round(float(df[col].isna().mean() * 100), 3),
            "unique_non_null": int(df[col].nunique(dropna=True)),
        })
    summary: dict[str, Any] = {
        "file": path.name,
        "rows": int(len(df)),
        "columns": int(len(df.columns)),
        "column_names": list(df.columns),
        "duplicate_rows": int(df.duplicated().sum()),
        "participant_id_column": id_col,
        "unique_participants": int(df[id_col].nunique(dropna=True)) if id_col else None,
        "phase_counts": df["phase"].astype("string").str.lower().value_counts(dropna=False).to_dict() if "phase" in df.columns else None,
        "numeric_summary": numeric.describe().round(4).to_dict() if not numeric.empty else {},
    }
    return {"summary": summary, "schema": schema}, df


def run_audit(dataset_root: Path, project_root: Path) -> None:
    data_dir = dataset_root / "data"
    reports_dir = project_root / "reports"
    tables_dir = reports_dir / "tables"
    reports_dir.mkdir(parents=True, exist_ok=True)
    tables_dir.mkdir(parents=True, exist_ok=True)

    if not dataset_root.exists():
        raise FileNotFoundError(f"Dataset root not found: {dataset_root}")
    if not data_dir.exists():
        raise FileNotFoundError(f"Expected data/ directory not found inside: {dataset_root}")

    found = sorted(data_dir.glob("*.csv"))
    found_names = {p.name for p in found}
    missing_expected = [name for name in EXPECTED_COLLECTIONS if name not in found_names]
    unexpected = [name for name in sorted(found_names) if name not in EXPECTED_COLLECTIONS]

    file_summaries: list[dict[str, Any]] = []
    schema_rows: list[dict[str, Any]] = []
    loaded: dict[str, pd.DataFrame] = {}
    for path in found:
        audit, df = audit_one(path)
        file_summaries.append(audit["summary"])
        for row in audit["schema"]:
            schema_rows.append({"file": path.name, **row})
        loaded[path.stem] = df

    pd.DataFrame(schema_rows).to_csv(tables_dir / "column_schema_and_missingness.csv", index=False)
    pd.DataFrame(file_summaries).to_json(reports_dir / "file_inventory.json", orient="records", indent=2)

    # Participant inventory and per-collection counts.
    participant_sets: dict[str, set[str]] = {}
    participant_counts: dict[str, dict[str, int]] = {}
    for stem, df in loaded.items():
        id_col = find_id_column(df)
        if id_col:
            ids = set(df[id_col].dropna().astype(str).unique())
            participant_sets[stem] = ids
            participant_counts[stem] = {"rows": int(len(df)), "unique_participants": int(len(ids))}

    all_ids = sorted(set().union(*participant_sets.values())) if participant_sets else []
    inventory_rows = []
    for pid in all_ids:
        row: dict[str, Any] = {"username": pid}
        for stem, df in loaded.items():
            id_col = find_id_column(df)
            if id_col:
                subset = df[df[id_col].astype("string") == pid]
                row[f"{stem}_rows"] = int(len(subset))
                if "phase" in subset.columns:
                    phases = sorted(subset["phase"].dropna().astype(str).str.lower().unique())
                    row[f"{stem}_phases"] = ";".join(phases)
        inventory_rows.append(row)
    pd.DataFrame(inventory_rows).to_csv(tables_dir / "participant_inventory.csv", index=False)

    # Label distribution for all collections that expose phase.
    label_rows = []
    for stem, df in loaded.items():
        if "phase" in df.columns:
            vc = df["phase"].astype("string").str.lower().value_counts(dropna=False)
            for label, count in vc.items():
                label_rows.append({"collection": stem, "label": str(label), "count": int(count)})
    pd.DataFrame(label_rows).to_csv(tables_dir / "phase_label_distribution.csv", index=False)

    # Targeted data checks without assuming unsupported sampling details.
    quality: list[str] = []
    quality.append("# Data quality report\n")
    quality.append(f"Dataset root: `{dataset_root}`\n")
    quality.append(f"CSV collections found: {len(found)}\n")
    quality.append(f"Expected collections missing: {missing_expected or 'None'}\n")
    quality.append(f"Unexpected CSV collections: {unexpected or 'None'}\n")
    quality.append(f"Distinct participant IDs across collections: {len(all_ids)}\n")
    quality.append("## Collection inventory\n")
    for item in file_summaries:
        quality.append(f"- `{item['file']}`: {item['rows']} rows, {item['columns']} columns, {item['unique_participants']} unique participants, {item['duplicate_rows']} duplicate rows.\n")

    for name in ["ecg", "eda", "fitbit_heart_rate_per_second", "fitbit_heart_rate_per_minute", "stai", "pss_14"]:
        if name in loaded:
            df = loaded[name]
            if "phase" in df.columns:
                quality.append(f"\n## {name}: phase coverage\n")
                quality.append(df["phase"].astype("string").str.lower().value_counts(dropna=False).to_string() + "\n")
            if "valid_data" in df.columns:
                quality.append(f"\n## {name}: valid_data values\n")
                quality.append(df["valid_data"].astype("string").value_counts(dropna=False).to_string() + "\n")
            if "time_sec" in df.columns:
                numeric_time = pd.to_numeric(df["time_sec"], errors="coerce")
                quality.append(f"\n## {name}: time_sec diagnostics\n")
                quality.append(f"Rows: {len(df)}; unique time markers: {numeric_time.nunique()}; repeated time_sec rows: {int(numeric_time.duplicated().sum())}; missing/non-numeric: {int(numeric_time.isna().sum())}.\n")

    # ECG waveform field diagnostics: only inspect string lengths, not assume units/amplitude.
    if "ecg" in loaded and "waveform_samples" in loaded["ecg"].columns:
        waveform = loaded["ecg"]["waveform_samples"].dropna().astype(str)
        quality.append("\n## ECG waveform field diagnostics\n")
        quality.append(f"Non-null waveform records: {len(waveform)}\n")
        quality.append(f"Example stored field length (characters): {len(waveform.iloc[0]) if len(waveform) else 'n/a'}\n")
        quality.append("The waveform field is stored as a sequence inside a CSV cell. Parse it only after verifying the exact delimiter and numeric format. Do not infer amplitude units unless supplied by dataset documentation.\n")

    (reports_dir / "data_quality_report.md").write_text("\n".join(quality), encoding="utf-8")

    checksums = parse_checksum_file(dataset_root / "SHA256SUMS.txt", dataset_root)
    pd.DataFrame(checksums).to_csv(tables_dir / "checksum_verification.csv", index=False)

    # A concise audit report with factual counts.
    lines = [
        "# QoL_Stress dataset audit",
        "",
        "This report was generated automatically. Review the raw data and official documentation before selecting labels/features.",
        "",
        f"- Dataset root: `{dataset_root}`",
        f"- CSV files found: {len(found)}",
        f"- Expected CSV files missing: {', '.join(missing_expected) if missing_expected else 'None'}",
        f"- Unexpected CSV files: {', '.join(unexpected) if unexpected else 'None'}",
        f"- Distinct participant IDs found across collections: {len(all_ids)}",
        f"- Checksum entries parsed: {len(checksums)}",
        f"- Checksum mismatches: {sum(1 for x in checksums if x.get('status') == 'HASH_MISMATCH')}",
        "",
        "## Files",
        "",
        "| File | Rows | Columns | Participants | Duplicate rows |",
        "|---|---:|---:|---:|---:|",
    ]
    for item in file_summaries:
        lines.append(f"| {item['file']} | {item['rows']} | {item['columns']} | {item['unique_participants'] if item['unique_participants'] is not None else 'n/a'} | {item['duplicate_rows']} |")
    lines += [
        "",
        "## Generated outputs",
        "",
        "- `reports/file_inventory.json`",
        "- `reports/data_quality_report.md`",
        "- `reports/tables/column_schema_and_missingness.csv`",
        "- `reports/tables/participant_inventory.csv`",
        "- `reports/tables/phase_label_distribution.csv`",
        "- `reports/tables/checksum_verification.csv`",
        "",
        "## Cautions",
        "",
        "- Do not split records randomly across train/test when records from the same participant appear in both sets.",
        "- Do not treat phase labels as a clinical diagnosis or as a direct measurement of chronic stress.",
        "- Preserve original EDA `time_sec` markers; repeated values are documented in the dataset and are not a one-second sample clock.",
        "- Do not assume missing recordings are negative examples.",
        "- Do not train until label semantics, participant grouping, modality alignment and missingness have been reviewed.",
    ]
    (reports_dir / "data_audit.md").write_text("\n".join(lines), encoding="utf-8")

    print("Audit complete. Original dataset files were not modified.")
    print(f"CSV files found: {len(found)}")
    print(f"Distinct participant IDs: {len(all_ids)}")
    print(f"Reports written to: {reports_dir.resolve()}")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dataset-root", required=True, help="Path to the named QoL_Stress dataset root")
    parser.add_argument("--project-root", default=".", help="ML workstream project root (default: current directory)")
    args = parser.parse_args()
    run_audit(Path(args.dataset_root), Path(args.project_root))


if __name__ == "__main__":
    main()

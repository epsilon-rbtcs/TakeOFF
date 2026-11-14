# QoL_Stress dataset audit

This report was generated automatically. Review the raw data and official documentation before selecting labels/features.

- Dataset root: `data\raw\qol_stress-a-multimodal-dataset-of-physiological-and-self-reported-stress-responses-1.0.0`
- CSV files found: 8
- Expected CSV files missing: None
- Unexpected CSV files: None
- Distinct participant IDs found across collections: 66
- Checksum entries parsed: 12
- Checksum mismatches: 0

## Files

| File | Rows | Columns | Participants | Duplicate rows |
|---|---:|---:|---:|---:|
| ecg.csv | 132 | 13 | 66 | 0 |
| eda.csv | 20094 | 6 | 64 | 1542 |
| fitbit_heart_rate_per_minute.csv | 2131 | 3 | 66 | 0 |
| fitbit_heart_rate_per_second.csv | 54462 | 3 | 66 | 0 |
| fitbit_heart_rate_summary.csv | 264 | 6 | 66 | 0 |
| participants.csv | 66 | 5 | 66 | 0 |
| pss_14.csv | 66 | 17 | 66 | 0 |
| stai.csv | 132 | 24 | 66 | 0 |

## Generated outputs

- `reports/file_inventory.json`
- `reports/data_quality_report.md`
- `reports/tables/column_schema_and_missingness.csv`
- `reports/tables/participant_inventory.csv`
- `reports/tables/phase_label_distribution.csv`
- `reports/tables/checksum_verification.csv`

## Cautions

- Do not split records randomly across train/test when records from the same participant appear in both sets.
- Do not treat phase labels as a clinical diagnosis or as a direct measurement of chronic stress.
- Preserve original EDA `time_sec` markers; repeated values are documented in the dataset and are not a one-second sample clock.
- Do not assume missing recordings are negative examples.
- Do not train until label semantics, participant grouping, modality alignment and missingness have been reviewed.
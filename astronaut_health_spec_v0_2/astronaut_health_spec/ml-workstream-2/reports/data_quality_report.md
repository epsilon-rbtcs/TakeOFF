# Data quality report

Dataset root: `data\raw\qol_stress-a-multimodal-dataset-of-physiological-and-self-reported-stress-responses-1.0.0`

CSV collections found: 8

Expected collections missing: None

Unexpected CSV collections: None

Distinct participant IDs across collections: 66

## Collection inventory

- `ecg.csv`: 132 rows, 13 columns, 66 unique participants, 0 duplicate rows.

- `eda.csv`: 20094 rows, 6 columns, 64 unique participants, 1542 duplicate rows.

- `fitbit_heart_rate_per_minute.csv`: 2131 rows, 3 columns, 66 unique participants, 0 duplicate rows.

- `fitbit_heart_rate_per_second.csv`: 54462 rows, 3 columns, 66 unique participants, 0 duplicate rows.

- `fitbit_heart_rate_summary.csv`: 264 rows, 6 columns, 66 unique participants, 0 duplicate rows.

- `participants.csv`: 66 rows, 5 columns, 66 unique participants, 0 duplicate rows.

- `pss_14.csv`: 66 rows, 17 columns, 66 unique participants, 0 duplicate rows.

- `stai.csv`: 132 rows, 24 columns, 66 unique participants, 0 duplicate rows.


## ecg: phase coverage

phase
relax     66
stress    66


## eda: phase coverage

phase
relax     10367
stress     9727


## eda: valid_data values

valid_data
True     19708
False      386


## eda: time_sec diagnostics

Rows: 20094; unique time markers: 128; repeated time_sec rows: 19966; missing/non-numeric: 0.


## stai: phase coverage

phase
relax     66
stress    66


## ECG waveform field diagnostics

Non-null waveform records: 132

Example stored field length (characters): 34792

The waveform field is stored as a sequence inside a CSV cell. Parse it only after verifying the exact delimiter and numeric format. Do not infer amplitude units unless supplied by dataset documentation.

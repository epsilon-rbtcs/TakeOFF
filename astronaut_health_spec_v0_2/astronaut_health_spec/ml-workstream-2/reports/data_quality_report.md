# Data quality report

Dataset root: `D:\Projects\TakeOFF\astronaut_health_spec_v0_2\astronaut_health_spec\ml-workstream-2\data\raw\qol_stress-a-multimodal-dataset-of-physiological-and-self-reported-stress-responses-1.0.0`

## Missing expected collections

None

## Participant coverage

Distinct participant IDs across all collections with an ID field: 66

## Collection-specific observations

### ecg

- Rows: 132
- Columns: 13
- Duplicate rows: 0
- Participant ID field: `username`
- Unique participants: 66
- Phase counts:
  - RELAX: 66
  - STRESS: 66

### eda

- Rows: 20094
- Columns: 6
- Duplicate rows: 1542
- Participant ID field: `username`
- Unique participants: 64
- Phase counts:
  - RELAX: 10367
  - STRESS: 9727
- `valid_data` values:
  - True: 19708
  - False: 386
- `time_sec`: 20094 numeric values; 128 unique markers; 20094 rows participate in repeated markers.

### fitbit_heart_rate_per_minute

- Rows: 2131
- Columns: 3
- Duplicate rows: 0
- Participant ID field: `username`
- Unique participants: 66

### fitbit_heart_rate_per_second

- Rows: 54462
- Columns: 3
- Duplicate rows: 0
- Participant ID field: `username`
- Unique participants: 66

### fitbit_heart_rate_summary

- Rows: 264
- Columns: 6
- Duplicate rows: 0
- Participant ID field: `username`
- Unique participants: 66

### participants

- Rows: 66
- Columns: 5
- Duplicate rows: 0
- Participant ID field: `username`
- Unique participants: 66

### pss_14

- Rows: 66
- Columns: 17
- Duplicate rows: 0
- Participant ID field: `username`
- Unique participants: 66

### stai

- Rows: 132
- Columns: 24
- Duplicate rows: 0
- Participant ID field: `username`
- Unique participants: 66
- Phase counts:
  - RELAX: 66
  - STRESS: 66

## Interpretation cautions

- Do not assume `time_sec` is a uniform one-second sampling clock.
- Do not silently interpolate or resample gaps.
- Do not assume that every modality has a complete matching record for every participant and phase.
- Do not interpret experimental phase labels as clinical outcomes.
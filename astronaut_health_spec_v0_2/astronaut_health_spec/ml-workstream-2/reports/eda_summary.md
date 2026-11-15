# QoL_Stress exploratory data analysis

- Project root: `D:\Projects\TakeOFF\astronaut_health_spec_v0_2\astronaut_health_spec\ml-workstream-2`
- Dataset root: `D:\Projects\TakeOFF\astronaut_health_spec_v0_2\astronaut_health_spec\ml-workstream-2\data\raw\qol_stress-a-multimodal-dataset-of-physiological-and-self-reported-stress-responses-1.0.0`
- Collections loaded: 8
- Collections missing: None

## Collection inventory

| Collection | Rows | Columns | Participants | Duplicate rows |
|---|---:|---:|---:|---:|
| ecg | 132 | 13 | 66 | 0 |
| eda | 20094 | 6 | 64 | 1542 |
| fitbit_heart_rate_per_minute | 2131 | 3 | 66 | 0 |
| fitbit_heart_rate_per_second | 54462 | 3 | 66 | 0 |
| fitbit_heart_rate_summary | 264 | 6 | 66 | 0 |
| participants | 66 | 5 | 66 | 0 |
| pss_14 | 66 | 17 | 66 | 0 |
| stai | 132 | 24 | 66 | 0 |

## Outputs

- `reports/tables/eda_collection_load_summary.csv`
- `reports/tables/eda_schema_missingness.csv`
- `reports/tables/eda_participant_coverage.csv`
- `reports/tables/eda_phase_distribution.csv`
- `reports/tables/eda_phase_participant_coverage.csv`
- `reports/tables/eda_participant_phase_row_counts.csv` (when EDA participant/phase fields exist)
- `reports/tables/ecg_recording_overview.csv` (when ECG waveform field exists)
- `reports/tables/fitbit_hr_representation_summary.csv`
- `reports/tables/cross_collection_linkage_inventory.csv`
- `reports/tables/participant_id_overlap.csv`
- Figures: `reports/figures/`

## Interpretation restrictions

1. `RELAX` and `STRESS` are experimental protocol phases, not clinical diagnoses.
2. EDA `time_sec` values and repeated timestamps are retained as exported; no interpolation or resampling was performed.
3. ECG waveform amplitude units are not assumed. The example plot is an unfiltered exported waveform.
4. Fitbit heart-rate data are not assigned phase labels based on guessed clock-time boundaries.
5. Participant ID overlap does not establish temporal synchronisation between modalities.
6. Descriptive distributions are not clinical reference ranges or validated decision thresholds.

## Before preprocessing / feature extraction

- Confirm each collection's row semantics against the official PhysioNet data description.
- Confirm the ECG waveform parser successfully decoded all or nearly all recordings; investigate any failures.
- Decide whether the first model should use ECG recording-level features, EDA recording-level features, or another clearly defined single modality.
- Preserve participant grouping for all validation. Do not randomly split rows or windows across participants.
- Keep all scaling, imputation, feature selection, and tuning inside each training fold.
- Do not fuse modalities until their participant, phase, and time alignment is demonstrated.

## Scientific scope

This dataset supports an exploratory study of physiological responses under a controlled experimental stress protocol in healthy adults. It does not by itself validate astronaut stress monitoring, chronic stress diagnosis, or clinical use.
# Preprocessing and Feature Engineering Report

- Project root: `D:\Projects\TakeOFF\astronaut_health_spec_v0_2\astronaut_health_spec\ml-workstream-2`
- Dataset: `qol_stress-a-multimodal-dataset-of-physiological-and-self-reported-stress-responses-1.0.0`
- ECG recordings loaded: 132
- Usable ECG waveforms by the documented quality gate: 132
- EDA participant-phase aggregates: 124
- Combined participant-phase rows: 132
- Unique participants: 66
- Rows without an EDA recording: 8

## Outputs
- `data/processed/ecg_features.csv`
- `data/processed/eda_features.csv`
- `data/processed/participant_phase_features.csv`
- `data/processed/participant_group_manifest.csv`
- `data/processed/fitbit_hr_per_second_participant_summary_audit_only.csv` (when available)
- `data/processed/fitbit_hr_per_minute_participant_summary_audit_only.csv` (when available)
- `reports/tables/ecg_waveform_quality_audit.csv`
- `reports/tables/model_feature_missingness.csv`
- `reports/tables/preprocessing_qc_summary.csv`

## Candidate model features
- `ecg_device_heart_rate_bpm`
- `ecg_mean_export_units`
- `ecg_median_export_units`
- `ecg_std_export_units`
- `ecg_mad_export_units`
- `ecg_iqr_export_units`
- `ecg_q05_export_units`
- `ecg_q95_export_units`
- `ecg_min_export_units`
- `ecg_max_export_units`
- `ecg_peak_to_peak_export_units`
- `ecg_rms_centered_export_units`
- `ecg_abs_first_difference_mean`
- `ecg_first_difference_std`
- `ecg_skewness`
- `ecg_excess_kurtosis`
- `ecg_relative_power_low_0p5_40hz`
- `ecg_relative_power_mid_0p5_40hz`
- `ecg_relative_power_high_0p5_40hz`
- `eda_scl_mean_us`
- `eda_scl_median_us`
- `eda_scl_std_us`
- `eda_scl_mad_us`
- `eda_scl_iqr_us`
- `eda_scl_min_us`
- `eda_scl_max_us`
- `eda_scl_slope_us_per_sec`

## Feature missingness
- `eda_scl_min_us`: 6.1%
- `eda_scl_max_us`: 6.1%
- `eda_scl_slope_us_per_sec`: 6.1%
- `eda_scl_mean_us`: 6.1%
- `eda_scl_median_us`: 6.1%
- `eda_scl_std_us`: 6.1%
- `eda_scl_mad_us`: 6.1%
- `eda_scl_iqr_us`: 6.1%
- `ecg_device_heart_rate_bpm`: 0.0%
- `ecg_mean_export_units`: 0.0%
- `ecg_median_export_units`: 0.0%
- `ecg_peak_to_peak_export_units`: 0.0%
- `ecg_max_export_units`: 0.0%
- `ecg_min_export_units`: 0.0%
- `ecg_q95_export_units`: 0.0%
- `ecg_q05_export_units`: 0.0%
- `ecg_iqr_export_units`: 0.0%
- `ecg_mad_export_units`: 0.0%
- `ecg_std_export_units`: 0.0%
- `ecg_relative_power_high_0p5_40hz`: 0.0%
- `ecg_relative_power_mid_0p5_40hz`: 0.0%
- `ecg_relative_power_low_0p5_40hz`: 0.0%
- `ecg_excess_kurtosis`: 0.0%
- `ecg_skewness`: 0.0%
- `ecg_first_difference_std`: 0.0%
- `ecg_abs_first_difference_mean`: 0.0%
- `ecg_rms_centered_export_units`: 0.0%

## Methodological safeguards
- Raw data were not overwritten.
- ECG waveforms with too few samples, non-finite sample fraction above 0.5%, or near-zero variance were not assigned waveform summary/spectral features.
- ECG amplitude features are in unspecified exported units; no conversion to mV was assumed.
- No R-peak/HRV claims were made from these approximately 30-second recordings.
- EDA SCL summaries use only rows marked `valid_data=True`; original `time_sec` markers and repeated timestamps were retained.
- Fitbit heart-rate summaries were not assigned phase labels because the documented files do not contain explicit phase labels.
- STAI/PSS and demographics were retained separately, not used as physiological model inputs.
- Missing values were preserved; imputation and scaling must be fitted inside training folds in the next notebook.
- Validation must be participant-independent (grouped/LOSO); random row splitting would leak participant-specific patterns.

## Interpretation boundary
This feature table supports an exploratory baseline for classifying the controlled RELAX/STRESS experimental phase in healthy adults. It is not a validated stress diagnosis, clinical decision tool, or validated astronaut-health model.

## Dataset citation
Calvo, A., Cejudo, A., & Martín Andonegui, C. (2026). *QoL_Stress: A Multimodal Dataset of Physiological and Self-Reported Stress Responses* (version 1.0.0). PhysioNet. https://doi.org/10.13026/vqtz-pm70
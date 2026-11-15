# Baseline Diagnostics & Error Analysis Report

- Project: `D:\Projects\TakeOFF\astronaut_health_spec_v0_2\astronaut_health_spec\ml-workstream-2`
- OOF prediction rows: 1,884
- Experiments: 5
- Models: 3
- Participants represented: 66

## Best baseline per experiment
- **ECG + EDA — paired cohort / Gradient Boosting**: balanced accuracy 0.562, macro-F1 0.560, RELAX recall 0.641, STRESS recall 0.483.
- **ECG — all eligible rows / Gradient Boosting**: balanced accuracy 0.598, macro-F1 0.597, RELAX recall 0.667, STRESS recall 0.530.
- **ECG — paired cohort / Gradient Boosting**: balanced accuracy 0.601, macro-F1 0.597, RELAX recall 0.719, STRESS recall 0.483.
- **EDA — all available rows / Random Forest**: balanced accuracy 0.693, macro-F1 0.693, RELAX recall 0.703, STRESS recall 0.683.
- **EDA — paired cohort / Random Forest**: balanced accuracy 0.693, macro-F1 0.693, RELAX recall 0.703, STRESS recall 0.683.

## Participant-level distribution
- **ECG — all eligible rows / Gradient Boosting**: 66 participants; median participant accuracy 0.500; 6 participants below 50% accuracy.
- **EDA — all available rows / Random Forest**: 64 participants; median participant accuracy 0.750; 7 participants below 50% accuracy.
- **ECG — paired cohort / Gradient Boosting**: 64 participants; median participant accuracy 0.500; 7 participants below 50% accuracy.
- **EDA — paired cohort / Random Forest**: 64 participants; median participant accuracy 0.750; 7 participants below 50% accuracy.
- **ECG + EDA — paired cohort / Gradient Boosting**: 64 participants; median participant accuracy 0.500; 13 participants below 50% accuracy.

## Paired EDA observations
- `eda_scl_std_us`: 60 paired participants; median STRESS−RELAX difference 0.186109; increase in 71.7% of paired participants.
- `eda_scl_mad_us`: 60 paired participants; median STRESS−RELAX difference 0.105; increase in 68.3% of paired participants.
- `eda_scl_iqr_us`: 60 paired participants; median STRESS−RELAX difference 0.36; increase in 63.3% of paired participants.
- `eda_scl_max_us`: 60 paired participants; median STRESS−RELAX difference 0.2; increase in 55.0% of paired participants.
- `eda_scl_mean_us`: 60 paired participants; median STRESS−RELAX difference -0.0168658; increase in 50.0% of paired participants.
- `eda_scl_median_us`: 60 paired participants; median STRESS−RELAX difference 0.01; increase in 50.0% of paired participants.
- `eda_scl_min_us`: 60 paired participants; median STRESS−RELAX difference -0.52; increase in 40.0% of paired participants.
- `eda_scl_slope_us_per_sec`: 60 paired participants; median STRESS−RELAX difference -0.005402; increase in 38.3% of paired participants.

## Interpretation and limitations
- These results are out-of-fold predictions from the saved participant-independent LOSO baseline run.
- Selecting the top score per experiment is descriptive; it is not final model approval.
- Participant-level results are variable and the cohort is small. Review the complete CSV tables and plots before making claims.
- Paired EDA feature differences are descriptive within-participant comparisons, not feature importance and not causal evidence.
- No threshold was tuned on held-out predictions.
- The task is controlled experimental RELAX/STRESS phase classification; it does not diagnose chronic stress or establish astronaut/spaceflight generalization.

## Generated artifacts
- `reports/diagnostics/prediction_integrity_checks.csv`
- `reports/diagnostics/best_model_by_experiment.csv`
- `reports/diagnostics/best_model_confusion_counts.csv`
- `reports/diagnostics/participant_performance_summary.csv`
- `reports/diagnostics/selected_models_participant_metrics.csv`
- `reports/diagnostics/paired_eda_phase_differences.csv` (when EDA features are present)
- Figures saved under `reports/figures/` with `diagnostic_`, `confusion_`, `participant_`, or `paired_eda_` prefixes.
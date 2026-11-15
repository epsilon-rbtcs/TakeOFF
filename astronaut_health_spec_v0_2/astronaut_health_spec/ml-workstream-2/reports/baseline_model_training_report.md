# Baseline Model Training Report

- Feature table: `D:\Projects\TakeOFF\astronaut_health_spec_v0_2\astronaut_health_spec\ml-workstream-2\data\processed\participant_phase_features.csv`
- Python: 3.11.18
- NumPy: 2.4.6
- pandas: 3.1.1
- scikit-learn: 1.9.1
- Random state: 42
- Total LOSO runtime: 76.9 seconds

## Evaluation method
- Leave-One-Subject-Out cross-validation; all rows belonging to a held-out participant remain outside that fold's training set.
- Median imputation is fitted inside each training fold; Logistic Regression scaling is also fitted inside each training fold.
- No random row-level train/test split was used.
- No hyperparameter search was performed; reported models are fixed baseline configurations.
- Primary metric: balanced accuracy. Secondary metrics: macro-F1, accuracy, RELAX recall/specificity, STRESS recall/sensitivity.

## Cohorts
- ECG — all eligible rows: 132 rows, 66 participants, RELAX=66, STRESS=66, 19 features.
- EDA — all available rows: 124 rows, 64 participants, RELAX=64, STRESS=60, 8 features.
- ECG — paired cohort: 124 rows, 64 participants, RELAX=64, STRESS=60, 19 features.
- EDA — paired cohort: 124 rows, 64 participants, RELAX=64, STRESS=60, 8 features.
- ECG + EDA — paired cohort: 124 rows, 64 participants, RELAX=64, STRESS=60, 27 features.

## Out-of-fold results

- **ECG + EDA — paired cohort / Gradient Boosting**: balanced accuracy=0.562; macro-F1=0.560; accuracy=0.565; RELAX recall=0.641; STRESS recall=0.483; n=124 observations / 64 participants.
- **ECG + EDA — paired cohort / Logistic Regression**: balanced accuracy=0.532; macro-F1=0.532; accuracy=0.532; RELAX recall=0.547; STRESS recall=0.517; n=124 observations / 64 participants.
- **ECG + EDA — paired cohort / Random Forest**: balanced accuracy=0.523; macro-F1=0.523; accuracy=0.524; RELAX recall=0.562; STRESS recall=0.483; n=124 observations / 64 participants.
- **ECG — all eligible rows / Gradient Boosting**: balanced accuracy=0.598; macro-F1=0.597; accuracy=0.598; RELAX recall=0.667; STRESS recall=0.530; n=132 observations / 66 participants.
- **ECG — all eligible rows / Random Forest**: balanced accuracy=0.576; macro-F1=0.573; accuracy=0.576; RELAX recall=0.652; STRESS recall=0.500; n=132 observations / 66 participants.
- **ECG — all eligible rows / Logistic Regression**: balanced accuracy=0.477; macro-F1=0.477; accuracy=0.477; RELAX recall=0.439; STRESS recall=0.515; n=132 observations / 66 participants.
- **ECG — paired cohort / Gradient Boosting**: balanced accuracy=0.601; macro-F1=0.597; accuracy=0.605; RELAX recall=0.719; STRESS recall=0.483; n=124 observations / 64 participants.
- **ECG — paired cohort / Random Forest**: balanced accuracy=0.514; macro-F1=0.513; accuracy=0.516; RELAX recall=0.578; STRESS recall=0.450; n=124 observations / 64 participants.
- **ECG — paired cohort / Logistic Regression**: balanced accuracy=0.484; macro-F1=0.484; accuracy=0.484; RELAX recall=0.484; STRESS recall=0.483; n=124 observations / 64 participants.
- **EDA — all available rows / Random Forest**: balanced accuracy=0.693; macro-F1=0.693; accuracy=0.694; RELAX recall=0.703; STRESS recall=0.683; n=124 observations / 64 participants.
- **EDA — all available rows / Gradient Boosting**: balanced accuracy=0.610; macro-F1=0.609; accuracy=0.613; RELAX recall=0.688; STRESS recall=0.533; n=124 observations / 64 participants.
- **EDA — all available rows / Logistic Regression**: balanced accuracy=0.570; macro-F1=0.569; accuracy=0.573; RELAX recall=0.641; STRESS recall=0.500; n=124 observations / 64 participants.
- **EDA — paired cohort / Random Forest**: balanced accuracy=0.693; macro-F1=0.693; accuracy=0.694; RELAX recall=0.703; STRESS recall=0.683; n=124 observations / 64 participants.
- **EDA — paired cohort / Gradient Boosting**: balanced accuracy=0.610; macro-F1=0.609; accuracy=0.613; RELAX recall=0.688; STRESS recall=0.533; n=124 observations / 64 participants.
- **EDA — paired cohort / Logistic Regression**: balanced accuracy=0.570; macro-F1=0.569; accuracy=0.573; RELAX recall=0.641; STRESS recall=0.500; n=124 observations / 64 participants.

## Outputs
- `reports/tables/loso_model_comparison.csv`
- `reports/tables/loso_oof_predictions.csv`
- `reports/tables/loso_fold_metrics.csv`
- `reports/tables/loso_per_participant_metrics.csv`
- `reports/figures/loso_balanced_accuracy_comparison.png`
- `reports/figures/loso_macro_f1_comparison.png`
- `configs/baseline_model_feature_manifest.json`

## Interpretation safeguards
- This task predicts the dataset's controlled experimental RELAX/STRESS phase; it does not diagnose chronic stress or a mental-health condition.
- This dataset is small and contains repeated observations from participants. LOSO reduces participant leakage but does not establish external generalization to astronauts or spaceflight.
- The paired ECG/EDA cohort is used for fairer modality/fusion comparison. Compare ECG-only, EDA-only and fusion results on that matched cohort rather than comparing only their different full-availability cohorts.
- The first best-scoring model is not automatically accepted as the final model. Review per-participant errors, class recalls, and stability before selecting it.
- No final production model is exported by this notebook. Model selection and final refitting should happen only after error analysis and methodological review.
- Fitbit data, STAI/PSS scores and demographics remain excluded from these physiological phase classifiers.

## Dataset citation
Calvo, A., Cejudo, A., & Martín Andonegui, C. (2026). *QoL_Stress: A Multimodal Dataset of Physiological and Self-Reported Stress Responses* (version 1.0.0). PhysioNet. https://doi.org/10.13026/vqtz-pm70
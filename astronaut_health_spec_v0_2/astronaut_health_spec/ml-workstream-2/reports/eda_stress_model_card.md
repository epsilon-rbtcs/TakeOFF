# EDA Stress-Phase Classifier — Model Card

## Identity
- Model ID: `eda_stress_random_forest_v1`
- Status: Experimental research/demo component
- Model: Median imputation + Random Forest classifier
- Dataset: QoL_Stress v1.0.0 (PhysioNet)
- Created (UTC): 2026-11-15T06:56:58.538188+00:00

## Intended use
Classify the controlled experimental `RELAX` versus `STRESS` phase represented in the QoL_Stress dataset, using the listed EDA summary features. This artifact is intended for software integration and demonstration of an ML inference workflow.

## Training data
- Observations used for full-cohort refit: 124
- Participants represented: 64
- RELAX observations: 64
- STRESS observations: 60

## Reference evaluation
The preceding participant-independent LOSO baseline reported balanced accuracy 0.693 and macro-F1 0.693 for EDA + Random Forest. These are out-of-fold cross-validation results from Notebook 04, not performance measured on this full-cohort refit. They are not evidence of clinical or spaceflight validity.

## Inputs
- `eda_scl_mean_us`
- `eda_scl_median_us`
- `eda_scl_std_us`
- `eda_scl_mad_us`
- `eda_scl_iqr_us`
- `eda_scl_min_us`
- `eda_scl_max_us`
- `eda_scl_slope_us_per_sec`

## Outputs
- `phase_prediction`: `RELAX` or `STRESS`
- `stress_probability_uncalibrated`: raw Random Forest class probability; not calibrated confidence and not a medical risk score
- `status`: `ok` or `insufficient_data`

## Important limitations
- Not a chronic-stress detector, psychiatric assessment, medical diagnostic, or treatment recommendation.
- Not trained or validated on astronauts or spaceflight data.
- Small controlled-study cohort; external generalization is unknown.
- Random Forest probabilities are uncalibrated.
- Inputs must be generated with the same feature definitions, units, and preprocessing semantics as the source feature table.
- Do not infer EDA features from unrelated measurements or fill missing sensor data with invented values.

## Dataset citation
Calvo, A., Cejudo, A., & Martín Andonegui, C. (2026). *QoL_Stress: A Multimodal Dataset of Physiological and Self-Reported Stress Responses* (version 1.0.0). PhysioNet. https://doi.org/10.13026/vqtz-pm70

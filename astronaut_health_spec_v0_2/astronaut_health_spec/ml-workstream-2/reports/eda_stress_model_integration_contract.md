# EDA Model Integration Contract

## Import
From the project root:

```python
from src.eda_stress_model import predict_eda_phase
```

## Function
`predict_eda_phase(features: Mapping[str, number | None]) -> dict`

## Required feature keys
- `eda_scl_mean_us`
- `eda_scl_median_us`
- `eda_scl_std_us`
- `eda_scl_mad_us`
- `eda_scl_iqr_us`
- `eda_scl_min_us`
- `eda_scl_max_us`
- `eda_scl_slope_us_per_sec`

Pass only features computed from actual EDA observations using the source feature definitions and compatible units. Individual features may be omitted or set to `None`; the saved median imputer handles missing individual inputs. If no expected feature has a usable finite numeric value, the function returns `status='insufficient_data'` and no phase prediction.

## Response example

```json
{
  "status": "ok",
  "model_id": "eda_stress_random_forest_v1",
  "phase_prediction": "STRESS",
  "stress_probability_uncalibrated": 0.61,
  "available_feature_count": 6,
  "required_feature_count": 8,
  "message": "Experimental phase-classifier output only; not a diagnosis or medical risk score."
}
```

The values above are illustrative response structure, not a model result.

## UI/API handling rules
- Label this component as an experimental EDA phase classifier.
- Display the prediction as a dataset-phase classification, not as an astronaut stress diagnosis.
- Never label `stress_probability_uncalibrated` as confidence, risk, or clinical probability.
- Preserve `insufficient_data`; do not substitute a default prediction.
- Store feature provenance, sensor timestamp, device/source identifier, model ID, and inference timestamp with any application record.
- The app must continue functioning when the model is unavailable; treat inference as optional decision-support content.

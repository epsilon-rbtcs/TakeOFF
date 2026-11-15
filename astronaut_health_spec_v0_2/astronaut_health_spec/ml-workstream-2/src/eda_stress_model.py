"""Experimental EDA phase classifier for the Astronaut Health Monitoring demo.

Predicts the controlled QoL_Stress RELAX/STRESS phase from EDA summary features.
This is not a medical diagnostic or astronaut-health model.
"""
from __future__ import annotations

from pathlib import Path
from typing import Any, Mapping
import json

import joblib
import numpy as np
import pandas as pd

_PROJECT_ROOT = Path(__file__).resolve().parents[1]
_MODEL_PATH = _PROJECT_ROOT / "models" / "eda_stress_random_forest.joblib"
_METADATA_PATH = _PROJECT_ROOT / "models" / "eda_stress_random_forest.metadata.json"


def _load_bundle():
    if not _MODEL_PATH.is_file() or not _METADATA_PATH.is_file():
        raise FileNotFoundError(
            "EDA model files are missing. Run notebooks/06_package_eda_model_for_product.ipynb first."
        )
    # Only load locally generated, trusted joblib artifacts. Never load untrusted pickle files.
    model = joblib.load(_MODEL_PATH)
    metadata = json.loads(_METADATA_PATH.read_text(encoding="utf-8"))
    return model, metadata


def predict_eda_phase(features: Mapping[str, Any]) -> dict[str, Any]:
    """Predict RELAX/STRESS from one EDA feature mapping.

    Missing individual values are handled by the saved median imputer. If every
    expected feature is missing/non-numeric/non-finite, no prediction is produced.
    """
    if not isinstance(features, Mapping):
        raise TypeError("features must be a mapping of feature name to numeric value")

    model, metadata = _load_bundle()
    feature_names = metadata["feature_columns"]
    row = {}
    finite_count = 0
    for name in feature_names:
        value = features.get(name)
        try:
            number = float(value)
            if not np.isfinite(number):
                number = np.nan
        except (TypeError, ValueError):
            number = np.nan
        if np.isfinite(number):
            finite_count += 1
        row[name] = number

    if finite_count == 0:
        return {
            "status": "insufficient_data",
            "model_id": metadata["model_id"],
            "phase_prediction": None,
            "stress_probability_uncalibrated": None,
            "available_feature_count": 0,
            "required_feature_count": len(feature_names),
            "message": "No usable EDA model features were supplied; no prediction was produced.",
        }

    input_frame = pd.DataFrame([row], columns=feature_names)
    predicted_class = int(model.predict(input_frame)[0])
    probabilities = model.predict_proba(input_frame)[0]
    classes = list(model.named_steps["model"].classes_)
    stress_probability = float(probabilities[classes.index(1)])

    return {
        "status": "ok",
        "model_id": metadata["model_id"],
        "phase_prediction": "STRESS" if predicted_class == 1 else "RELAX",
        "stress_probability_uncalibrated": stress_probability,
        "available_feature_count": finite_count,
        "required_feature_count": len(feature_names),
        "message": "Experimental phase-classifier output only; not a diagnosis or medical risk score.",
    }

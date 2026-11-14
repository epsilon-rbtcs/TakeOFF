# ML Workstream 2 — QoL_Stress starter

This starter contains a non-destructive dataset audit script and notebook. It does not train a model.

## Expected raw dataset location

Keep the original PhysioNet folder name exactly:

`data/raw/qol_stress-a-multimodal-dataset-of-physiological-and-self-reported-stress-responses-1.0.0/`

Its root should contain `data/`, `data_description.csv`, `LICENSE.txt`, `PHYSIONET_REPORT.md`, `README.md`, and `SHA256SUMS.txt`. The `data/` directory should contain the eight CSV collections supplied by PhysioNet.

Do not rename or edit the raw files.

## Run the audit

From this project root, with the `astronaut-ml` Conda environment active:

```powershell
python src/data/audit_dataset.py --dataset-root "data/raw/qol_stress-a-multimodal-dataset-of-physiological-and-self-reported-stress-responses-1.0.0"
```

Or launch Jupyter:

```powershell
jupyter lab
```

Open `notebooks/01_dataset_audit.ipynb` and run all cells from top to bottom.

The script/notebook write summaries under `reports/` and `reports/tables/`. They do not modify source files.

## Planned workflow

1. `01_dataset_audit.ipynb` — inspect the raw data and integrity (provided).
2. `02_exploratory_data_analysis.ipynb` — visualize participant/phase/modality distributions.
3. `03_preprocessing.ipynb` — define and validate preprocessing only after auditing.
4. `04_feature_engineering.ipynb` — extract per-record/per-participant features.
5. `05_baseline_models.ipynb` — fit simple baselines with subject-independent evaluation.
6. `06_model_comparison.ipynb` — compare candidate models using identical folds.
7. `07_error_analysis.ipynb` — inspect per-participant failures and limitations.

Do not make a random row-level train/test split. The participant is the independent grouping unit. Never put `username` into the feature matrix. Preserve RELAX/STRESS as experimental phase labels; they do not represent a clinical diagnosis or chronic stress state.

## Important scientific cautions

- ECG: 132 recordings from 66 participants; waveforms are stored as a sequence in one CSV field. The dataset describes 30-second recordings at 250 Hz.
- EDA: 124 recordings; eight expected recordings are missing. `time_sec` is a retained device-export marker, can repeat, and must not be interpreted as a one-second sampling clock. Do not interpolate/resample by default.
- Heart-rate series are distinct collections and may have different temporal granularity. Verify actual coverage before attempting multimodal alignment.
- PSS-14 measures perceived stress over the past month; STAI-S measures state anxiety. Do not treat either as interchangeable with the experimental phase label.
- Use only the claims supported by the dataset documentation and your audit.

Dataset citation: Calvo, A., Cejudo, A., & Martín Andonegui, C. (2026). *QoL_Stress: A Multimodal Dataset of Physiological and Self-Reported Stress Responses* (version 1.0.0). PhysioNet. https://doi.org/10.13026/vqtz-pm70. License: CC BY 4.0; retain attribution and the original license.

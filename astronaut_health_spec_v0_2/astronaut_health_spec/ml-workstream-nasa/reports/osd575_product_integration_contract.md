# OSD-575 Product Integration Contract

## Purpose

This export provides retrospective NASA OSD-575 biomarker observations for controlled import into the Astronaut Health Monitoring application. It is a research-data adapter, not a clinical decision engine.

## Files

- `data/processed/osd575_product_observations.csv`: flat observation table.
- `data/processed/osd575_product_observations.jsonl`: one JSON object per observation.
- `data/processed/osd575_biomarker_catalog.csv`: analyte/unit catalog.
- `data/processed/osd575_personal_baseline_changes.csv`: descriptive post-flight differences from each crew member's available pre-flight measurements.
- `configs/osd575_observation_schema.json`: versioned field contract.

## Import rules

1. Treat every record as `retrospective_research`, never as a live telemetry message.
2. Keep the source `subject_id`, `sample_id`, and `timepoint_text`; do not convert relative visit labels into invented timestamps.
3. Preserve numeric `value` and its original `unit` together. Never combine different analytes or units.
4. Retain `observation_id` and `upstream_measurement_record_id` for idempotent imports and traceability.
5. Retain source version, file, table, sheet, and row provenance.
6. Do not surface `personal_baseline_changes` as a medical alert. They are descriptive comparisons only.
7. Do not apply clinical reference ranges, diagnostic labels, risk scores, or treatment recommendations from this dataset.
8. Display a clear label such as `NASA OSD-575 research reference data` anywhere these records appear in a demo.

## Domain mapping

- `comprehensive_metabolic_panel` -> `metabolic`
- `immune_*` -> `immune`
- `cardiovascular_*` -> `cardiovascular`
- unrecognized families -> `unclassified`

The mapping is based on assay family metadata only. It does not infer the clinical meaning of an individual analyte.

## Timestamp semantics

`timepoint_text` contains the original visit label. `measured_at_utc` remains null because this adapter does not infer an exact collection timestamp from a relative flight-time label.

## Limitations

OSD-575 is a very small Inspiration4 cohort. These observations support data-pipeline development and descriptive longitudinal exploration; they do not validate a generalized astronaut-health model.

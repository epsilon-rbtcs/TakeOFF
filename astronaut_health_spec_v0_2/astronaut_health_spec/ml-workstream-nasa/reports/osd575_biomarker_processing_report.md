# OSD-575 Biomarker Processing Report

- Workstream: `D:\Projects\TakeOFF\astronaut_health_spec_v0_2\astronaut_health_spec\ml-workstream-nasa`
- Primary source policy: `prefer_transformed`
- Source tables loaded: 7
- All-source normalized records: 18,562
- Primary normalized records: 15,813
- Distinct participants identified in primary table: 0
- Runtime: 2.94 seconds (normalization timing; notebook total may be longer)

## Primary source selection

| assay_family | selected_version | selected_tables | reason |
| --- | --- | --- | --- |
| cardiovascular_multiplex | TRANSFORMED | LSDS-8_Multiplex_serum_cardiovascular_EvePanel_TRANSFORMED | Selected configured preference: TRANSFORMED. |
| comprehensive_metabolic_panel | TRANSFORMED | LSDS-8_Comprehensive_Metabolic_Panel_CMP_TRANSFORMED | Selected configured preference: TRANSFORMED. |
| immune_alamar_multiplex | TRANSFORMED | LSDS-8_Multiplex_serum.immune.AlamarPanel_TRANSFORMED | Selected configured preference: TRANSFORMED. |
| immune_eve_multiplex | TRANSFORMED | LSDS-8_Multiplex_serum_immune_EvePanel_TRANSFORMED | Selected configured preference: TRANSFORMED. |

## Primary table coverage

| assay_family | records | analytes | subjects | timepoints |
| --- | --- | --- | --- | --- |
| cardiovascular_multiplex | 504 | 18 | 0 | 0 |
| comprehensive_metabolic_panel | 425 | 16 | 0 | 0 |
| immune_alamar_multiplex | 10908 | 404 | 0 | 0 |
| immune_eve_multiplex | 3976 | 142 | 0 | 0 |

## Source-version coverage (all normalized sources)

| assay_family | source_version | records |
| --- | --- | --- |
| cardiovascular_multiplex | SUBMITTED | 252 |
| cardiovascular_multiplex | TRANSFORMED | 504 |
| comprehensive_metabolic_panel | SUBMITTED | 509 |
| comprehensive_metabolic_panel | TRANSFORMED | 425 |
| immune_alamar_multiplex | TRANSFORMED | 10908 |
| immune_eve_multiplex | SUBMITTED | 1988 |
| immune_eve_multiplex | TRANSFORMED | 3976 |

## Validation checks

| check | count | status |
| --- | --- | --- |
| primary_records | 15813 | INFO |
| records_missing_subject_id | 15813 | REVIEW |
| records_missing_timepoint | 15813 | REVIEW |
| records_missing_unit | 15813 | REVIEW |
| non_numeric_or_censored_values | 0 | PASS |
| duplicate_family_subject_time_analyte_unit | 15813 | REVIEW |
| negative_numeric_values | 0 | REVIEW |

## Column mapping

| table | source_file | assay_family | source_version | layout_detected | subject_column | sample_column | timepoint_column | analyte_column | value_column | unit_column | normalized_records | rows_without_subject_id | rows_without_timepoint | rows_without_unit |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| LSDS-8_Comprehensive_Metabolic_Panel_CMP.upload_SUBMITTED | LSDS-8_Comprehensive_Metabolic_Panel_CMP.upload_SUBMITTED.csv | comprehensive_metabolic_panel | SUBMITTED | long | SUBJECT_ID |  | timepoint | ANALYTE | VALUE | UNITS | 509 | 0 | 0 | 0 |
| LSDS-8_Comprehensive_Metabolic_Panel_CMP_TRANSFORMED | LSDS-8_Comprehensive_Metabolic_Panel_CMP_TRANSFORMED.csv | comprehensive_metabolic_panel | TRANSFORMED | wide |  | Sample Name |  |  | albumin_value_gram_per_deciliter | alkaline_phosphatase_value_units_per_liter | 425 | 425 | 425 | 425 |
| LSDS-8_Multiplex_serum.cardiovascular.EvePanel_SUBMITTED | LSDS-8_Multiplex_serum.cardiovascular.EvePanel_SUBMITTED.csv | cardiovascular_multiplex | SUBMITTED | long |  |  | Timepoint | Analyte | Concentration | Unit | 252 | 252 | 0 | 0 |
| LSDS-8_Multiplex_serum.immune.AlamarPanel_TRANSFORMED | LSDS-8_Multiplex_serum.immune.AlamarPanel_TRANSFORMED.csv | immune_alamar_multiplex | TRANSFORMED | wide |  | Sample ID |  |  | activin_a_concentration_npq |  | 10908 | 10908 | 10908 | 10908 |
| LSDS-8_Multiplex_serum.immune.EvePanel_SUBMITTED | LSDS-8_Multiplex_serum.immune.EvePanel_SUBMITTED.csv | immune_eve_multiplex | SUBMITTED | long |  |  | Timepoint | Analyte | Concentration | Unit | 1988 | 1988 | 0 | 0 |
| LSDS-8_Multiplex_serum_cardiovascular_EvePanel_TRANSFORMED | LSDS-8_Multiplex_serum_cardiovascular_EvePanel_TRANSFORMED.csv | cardiovascular_multiplex | TRANSFORMED | wide |  | Sample Name |  |  | a2_macroglobulin_concentration_nanogram_per_milliliter |  | 504 | 504 | 504 | 504 |
| LSDS-8_Multiplex_serum_immune_EvePanel_TRANSFORMED | LSDS-8_Multiplex_serum_immune_EvePanel_TRANSFORMED.csv | immune_eve_multiplex | TRANSFORMED | wide |  | Sample Name |  |  | 6ckine_concentration_picogram_per_milliliter |  | 3976 | 3976 | 3976 | 3976 |

## Interpretation and use safeguards

- Submitted and transformed exports are normalized separately; do not count both as independent biological observations.
- The primary table follows the configured source policy. Review `osd575_primary_source_selection.csv` and the original EDA comparison before using it in a product.
- Units are never inferred from another assay or biomarker. Missing units remain missing.
- Rows without subject or timepoint mapping are retained but must be resolved before longitudinal person-level analysis.
- Repeated measurements, duplicates and negative values are flagged for inspection, not automatically deleted.
- This dataset represents four Inspiration4 crew members and a limited set of serum collection timepoints; it is not sufficient to validate population-wide astronaut-health predictions.
- This notebook performs data normalization and descriptive aggregation only; it does not produce diagnoses or clinical alert thresholds.

## Output files

- `data\processed\osd575_measurements_long_all_sources.csv`
- `data\processed\osd575_measurements_long_primary.csv`
- `data\processed\osd575_sample_timepoint_manifest.csv`
- `data\processed\osd575_subject_timepoint_biomarkers.csv`
- `reports\tables\osd575_analyte_timepoint_summary.csv`
- `reports\tables\osd575_processing_validation.csv`
- `reports\tables\osd575_column_mapping_and_normalization.csv`
- `reports\tables\osd575_primary_source_selection.csv`

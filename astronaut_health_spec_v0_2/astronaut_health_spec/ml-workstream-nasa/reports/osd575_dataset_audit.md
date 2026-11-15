# NASA OSD-575 Dataset Audit

- Audit timestamp: 2026-11-15T13:10:22
- Raw directory: `D:\Projects\TakeOFF\astronaut_health_spec_v0_2\astronaut_health_spec\ml-workstream-nasa\data\raw\OSD-575`
- Files discovered: 14
- Total raw size: 0.70 MB
- ISA metadata files: 6
- Candidate assay/result files: 8
- ZIP archives: 0

## Raw file inventory

| filename | extension | detected_role | size_kb |
| --- | --- | --- | --- |
| a_OSD-575_analytical-chemistry_comprehensive-metabolic-panel_quest diagnostics.txt | .txt | ISA metadata | 7.79 |
| a_OSD-575_immunoassay_multiplex_Alamar Biosciences.txt | .txt | ISA metadata | 10.66 |
| a_OSD-575_immunoassay_multiplex_Eve Technologies Panel HD71.txt | .txt | ISA metadata | 11.39 |
| a_OSD-575_immunoassay_multiplex_Eve Technologies Panel HDCVD9.txt | .txt | ISA metadata | 12.73 |
| i_Investigation.txt | .txt | ISA metadata | 13.43 |
| LSDS-8_Comprehensive_Metabolic_Panel_CMP.upload_SUBMITTED.csv | .csv | Candidate assay/result table | 24.68 |
| LSDS-8_Comprehensive_Metabolic_Panel_CMP_TRANSFORMED.csv | .csv | Candidate assay/result table | 8.31 |
| LSDS-8_Multiplex_serum.cardiovascular.EvePanel_SUBMITTED.csv | .csv | Candidate assay/result table | 14.88 |
| LSDS-8_Multiplex_serum.immune.AlamarPanel_SUBMITTED.xlsx | .xlsx | Candidate assay/result table | 315.23 |
| LSDS-8_Multiplex_serum.immune.AlamarPanel_TRANSFORMED.csv | .csv | Candidate assay/result table | 138.46 |
| LSDS-8_Multiplex_serum.immune.EvePanel_SUBMITTED.csv | .csv | Candidate assay/result table | 104.9 |
| LSDS-8_Multiplex_serum_cardiovascular_EvePanel_TRANSFORMED.csv | .csv | Candidate assay/result table | 6.06 |
| LSDS-8_Multiplex_serum_immune_EvePanel_TRANSFORMED.csv | .csv | Candidate assay/result table | 40.25 |
| s_OSD-575.txt | .txt | ISA metadata | 12.98 |

## ISA metadata tables

| filename | status | rows | columns |
| --- | --- | --- | --- |
| a_OSD-575_analytical-chemistry_comprehensive-metabolic-panel_quest diagnostics.txt | loaded | 28.0 | 12.0 |
| a_OSD-575_immunoassay_multiplex_Alamar Biosciences.txt | loaded | 27.0 | 16.0 |
| a_OSD-575_immunoassay_multiplex_Eve Technologies Panel HD71.txt | loaded | 28.0 | 15.0 |
| a_OSD-575_immunoassay_multiplex_Eve Technologies Panel HDCVD9.txt | loaded | 28.0 | 15.0 |
| i_Investigation.txt | failed: ParserError: Expected 1 fields in line 35, saw 2 |  |  |
| s_OSD-575.txt | loaded | 28.0 | 25.0 |

## Assay/result tables

| filename | sheet | status | rows | columns |
| --- | --- | --- | --- | --- |
| LSDS-8_Comprehensive_Metabolic_Panel_CMP.upload_SUBMITTED.csv |  | loaded | 531.0 | 9.0 |
| LSDS-8_Comprehensive_Metabolic_Panel_CMP_TRANSFORMED.csv |  | loaded | 28.0 | 58.0 |
| LSDS-8_Multiplex_serum.cardiovascular.EvePanel_SUBMITTED.csv |  | loaded | 252.0 | 8.0 |
| LSDS-8_Multiplex_serum.immune.AlamarPanel_SUBMITTED.xlsx |  | failed: ImportError: Excel engine missing. For .xlsx/.xlsm install openpyxl; for .xls install xlrd; for .xlsb install pyxlsb. |  |  |
| LSDS-8_Multiplex_serum.immune.AlamarPanel_TRANSFORMED.csv |  | loaded | 27.0 | 407.0 |
| LSDS-8_Multiplex_serum.immune.EvePanel_SUBMITTED.csv |  | loaded | 1988.0 | 8.0 |
| LSDS-8_Multiplex_serum_cardiovascular_EvePanel_TRANSFORMED.csv |  | loaded | 28.0 | 19.0 |
| LSDS-8_Multiplex_serum_immune_EvePanel_TRANSFORMED.csv |  | loaded | 28.0 | 143.0 |

## Duplicate row summary

| table | rows | duplicate_full_rows |
| --- | --- | --- |
| LSDS-8_Comprehensive_Metabolic_Panel_CMP.upload_SUBMITTED.csv | 531 | 0 |
| LSDS-8_Comprehensive_Metabolic_Panel_CMP_TRANSFORMED.csv | 28 | 0 |
| LSDS-8_Multiplex_serum.cardiovascular.EvePanel_SUBMITTED.csv | 252 | 0 |
| LSDS-8_Multiplex_serum.immune.AlamarPanel_TRANSFORMED.csv | 27 | 0 |
| LSDS-8_Multiplex_serum.immune.EvePanel_SUBMITTED.csv | 1988 | 0 |
| LSDS-8_Multiplex_serum_cardiovascular_EvePanel_TRANSFORMED.csv | 28 | 0 |
| LSDS-8_Multiplex_serum_immune_EvePanel_TRANSFORMED.csv | 28 | 0 |

## Important interpretation safeguards

- This audit reports source-file structure and descriptive data quality; it does not infer clinical normality.
- Submitted and transformed files are retained as separate source tables. Do not combine them until their schemas and processing relationship are reviewed.
- Subject/sample/timepoint fields are identified by column-name patterns only and require verification against the ISA metadata.
- A numerical column is not automatically a biomarker concentration. Confirm its meaning and unit in the source metadata.
- The small Inspiration4 crew cohort is suitable for carefully described longitudinal case-series analysis, not broad population-level model claims.

## Generated outputs

- `reports/tables/osd575_raw_file_inventory.csv`
- `reports/tables/osd575_isa_metadata_schema.csv`
- `reports/tables/osd575_assay_table_schema.csv`
- `reports/tables/osd575_candidate_identity_measurement_columns.csv`
- `reports/tables/osd575_column_missingness.csv`
- `reports/tables/osd575_duplicate_row_summary.csv`
- `reports/tables/osd575_numeric_column_summary.csv`
- `reports/tables/osd575_column_dtypes.csv`
- `reports/tables/osd575_raw_sha256_checksums.csv`
- `reports/figures/` distribution plots
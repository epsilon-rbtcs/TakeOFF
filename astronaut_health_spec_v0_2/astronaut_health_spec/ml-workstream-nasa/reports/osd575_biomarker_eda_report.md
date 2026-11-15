# NASA OSD-575 Biomarker EDA Report

- Workstream: `D:\Projects\TakeOFF\astronaut_health_spec_v0_2\astronaut_health_spec\ml-workstream-nasa`
- Raw folder: `D:\Projects\TakeOFF\astronaut_health_spec_v0_2\astronaut_health_spec\ml-workstream-nasa\data\raw\OSD-575`
- Files discovered: 14
- Assay tables loaded: 7
- Report generated: 2026-11-15T13:29:23

## Important interpretation limits
- OSD-575 concerns four Inspiration4 crew members; repeated samples do not turn this into a large independent cohort.
- The plots and summaries are descriptive, not clinical interpretation or population-level inference.
- SUBMITTED and TRANSFORMED files are profiled separately. This notebook does not choose a canonical source or merge these versions.
- Numerical values are not compared across assays unless their units and analyte definitions are confirmed.
- Any timepoint shown is taken from the actual file values; the study-page schedule is not imposed on the data.

## Assay table inventory
| table | assay_family | file_version | rows | columns |
| --- | --- | --- | --- | --- |
| LSDS-8_Multiplex_serum.cardiovascular.EvePanel_SUBMITTED | cardiovascular_multiplex | SUBMITTED | 252 | 8 |
| LSDS-8_Multiplex_serum_cardiovascular_EvePanel_TRANSFORMED | cardiovascular_multiplex | TRANSFORMED | 28 | 19 |
| LSDS-8_Comprehensive_Metabolic_Panel_CMP.upload_SUBMITTED | comprehensive_metabolic_panel | SUBMITTED | 531 | 9 |
| LSDS-8_Comprehensive_Metabolic_Panel_CMP_TRANSFORMED | comprehensive_metabolic_panel | TRANSFORMED | 28 | 58 |
| LSDS-8_Multiplex_serum.immune.AlamarPanel_TRANSFORMED | immune_alamar_multiplex | TRANSFORMED | 27 | 407 |
| LSDS-8_Multiplex_serum.immune.EvePanel_SUBMITTED | immune_eve_multiplex | SUBMITTED | 1988 | 8 |
| LSDS-8_Multiplex_serum_immune_EvePanel_TRANSFORMED | immune_eve_multiplex | TRANSFORMED | 28 | 143 |

## Load status
| file | table | status | rows | columns | detail |
| --- | --- | --- | --- | --- | --- |
| LSDS-8_Comprehensive_Metabolic_Panel_CMP.upload_SUBMITTED.csv | LSDS-8_Comprehensive_Metabolic_Panel_CMP.upload_SUBMITTED | loaded | 531.0 | 9.0 |  |
| LSDS-8_Comprehensive_Metabolic_Panel_CMP_TRANSFORMED.csv | LSDS-8_Comprehensive_Metabolic_Panel_CMP_TRANSFORMED | loaded | 28.0 | 58.0 |  |
| LSDS-8_Multiplex_serum.cardiovascular.EvePanel_SUBMITTED.csv | LSDS-8_Multiplex_serum.cardiovascular.EvePanel_SUBMITTED | loaded | 252.0 | 8.0 |  |
| LSDS-8_Multiplex_serum.immune.AlamarPanel_SUBMITTED.xlsx |  | error |  |  | ImportError: `Import openpyxl` failed.  Use pip, conda, or your preferred package management tool to install the openpyxl package. |
| LSDS-8_Multiplex_serum.immune.AlamarPanel_TRANSFORMED.csv | LSDS-8_Multiplex_serum.immune.AlamarPanel_TRANSFORMED | loaded | 27.0 | 407.0 |  |
| LSDS-8_Multiplex_serum.immune.EvePanel_SUBMITTED.csv | LSDS-8_Multiplex_serum.immune.EvePanel_SUBMITTED | loaded | 1988.0 | 8.0 |  |
| LSDS-8_Multiplex_serum_cardiovascular_EvePanel_TRANSFORMED.csv | LSDS-8_Multiplex_serum_cardiovascular_EvePanel_TRANSFORMED | loaded | 28.0 | 19.0 |  |
| LSDS-8_Multiplex_serum_immune_EvePanel_TRANSFORMED.csv | LSDS-8_Multiplex_serum_immune_EvePanel_TRANSFORMED | loaded | 28.0 | 143.0 |  |

## Structural comparison of submitted and transformed files
| assay_family | submitted_table | transformed_table | submitted_shape | transformed_shape | common_column_count | submitted_only_columns | transformed_only_columns | common_columns |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| cardiovascular_multiplex | LSDS-8_Multiplex_serum.cardiovascular.EvePanel_SUBMITTED | LSDS-8_Multiplex_serum_cardiovascular_EvePanel_TRANSFORMED | (252, 8) | (28, 19) | 0 | Analyte / Concentration / ID / Percent / Timepoint / Timepoint2 / Type / Unit | Sample Name / a2_macroglobulin_concentration_nanogram_per_milliliter / a2_macroglobulin_percent / agp_concentration_nanogram_per_milliliter / agp_percent / crp_concentration_picogram_per_milliliter / crp_percent / fetuin_a36_concentration_nanogram_per_milliliter / fetuin_a36_percent / fibrinogen_concentration_nanogram_per_milliliter / fibrinogen_percent / haptoglobin_concentration_nanogram_per_milliliter / haptoglobin_percent / l_selectin_concentration_picogram_per_milliliter / l_selectin_percent / pf4_concentration_nanogram_per_milliliter / pf4_percent / sap_concentration_picogram_per_milliliter / sap_percent |  |
| comprehensive_metabolic_panel | LSDS-8_Comprehensive_Metabolic_Panel_CMP.upload_SUBMITTED | LSDS-8_Comprehensive_Metabolic_Panel_CMP_TRANSFORMED | (531, 9) | (28, 58) | 0 | ANALYTE / RANGE_MAX / RANGE_MIN / SEX / SUBJECT_ID / TEST_TYPE / UNITS / VALUE / timepoint | Sample Name / albumin_range_max_gram_per_deciliter / albumin_range_min_gram_per_deciliter / albumin_to_globulin_ratio_range_max / albumin_to_globulin_ratio_range_min / albumin_to_globulin_ratio_value / albumin_value_gram_per_deciliter / alkaline_phosphatase_range_max_units_per_liter / alkaline_phosphatase_range_min_units_per_liter / alkaline_phosphatase_value_units_per_liter / alt_max_units_per_liter / alt_range_min_units_per_liter / alt_value_units_per_liter / ast_max_units_per_liter / ast_range_min_units_per_liter / ast_value_units_per_liter / bun_to_creatinine_ratio_range_max / bun_to_creatinine_ratio_range_min / bun_to_creatinine_ratio_value / calcium_range_max_milligram_per_deciliter / calcium_range_min_milligram_per_deciliter / calcium_value_milligram_per_deciliter / carbon_dioxide_range_max_millimol_per_liter / carbon_dioxide_range_min_millimol_per_liter / carbon_dioxide_value_millimol_per_liter / chloride_range_max_millimol_per_liter / chloride_range_min_millimol_per_liter / chloride_value_millimol_per_liter / creatinine_range_max_milligram_per_deciliter / creatinine_range_min_milligram_per_deciliter / creatinine_value_milligram_per_deciliter / egfr_african_american_range_max_milliliter_per_minute_per_1.73_meter_squared / egfr_african_american_range_min_milliliter_per_minute_per_1.73_meter_squared / egfr_african_american_value_milliliter_per_minute_per_1.73_meter_squared / egfr_non_african_american_range_max_milliliter_per_minute_per_1.73_meter_squared / egfr_non_african_american_range_min_milliliter_per_minute_per_1.73_meter_squared / egfr_non_african_american_value_milliliter_per_minute_per_1.73_meter_squared / globulin_range_max_gram_per_deciliter / globulin_range_min_gram_per_deciliter / globulin_value_gram_per_deciliter / glucose_range_max_milligram_per_deciliter / glucose_range_min_milligram_per_deciliter / glucose_value_milligram_per_deciliter / potassium_range_max_millimol_per_liter / potassium_range_min_millimol_per_liter / potassium_value_millimol_per_liter / sodium_range_max_millimol_per_liter / sodium_range_min_millimol_per_liter / sodium_value_millimol_per_liter / total_bilirubin_range_max_milligram_per_deciliter / total_bilirubin_range_min_milligram_per_deciliter / total_bilirubin_value_milligram_per_deciliter / total_protein_range_max_gram_per_deciliter / total_protein_range_min_gram_per_deciliter / total_protein_value_gram_per_deciliter / urea_nitrogen_bun_range_max_milligram_per_deciliter / urea_nitrogen_bun_range_min_milligram_per_deciliter / urea_nitrogen_bun_value_milligram_per_deciliter |  |
| immune_eve_multiplex | LSDS-8_Multiplex_serum.immune.EvePanel_SUBMITTED | LSDS-8_Multiplex_serum_immune_EvePanel_TRANSFORMED | (1988, 8) | (28, 143) | 0 | Analyte / Concentration / ID / Percent / Timepoint / Timepoint2 / Type / Unit | 6ckine_concentration_picogram_per_milliliter / 6ckine_percent / Sample Name / bca_1_concentration_picogram_per_milliliter / bca_1_percent / ctack_concentration_picogram_per_milliliter / ctack_percent / egf_concentration_picogram_per_milliliter / egf_percent / ena_78_concentration_picogram_per_milliliter / ena_78_percent / eotaxin_2_concentration_picogram_per_milliliter / eotaxin_2_percent / eotaxin_3_concentration_picogram_per_milliliter / eotaxin_3_percent / eotaxin_concentration_picogram_per_milliliter / eotaxin_percent / fgf_2_concentration_picogram_per_milliliter / fgf_2_percent / flt_3l_concentration_picogram_per_milliliter / flt_3l_percent / fractalkine_concentration_picogram_per_milliliter / fractalkine_percent / g_csf_concentration_picogram_per_milliliter / g_csf_percent / gm_csf_concentration_picogram_per_milliliter / gm_csf_percent / groα_concentration_picogram_per_milliliter / groα_percent / i_309_concentration_picogram_per_milliliter / i_309_percent / ifn_α2_concentration_picogram_per_milliliter / ifn_α2_percent / ifnγ_concentration_picogram_per_milliliter / ifnγ_percent / il_10_concentration_picogram_per_milliliter / il_10_percent / il_12p40_concentration_picogram_per_milliliter / il_12p40_percent / il_12p70_concentration_picogram_per_milliliter / il_12p70_percent / il_13_concentration_picogram_per_milliliter / il_13_percent / il_15_concentration_picogram_per_milliliter / il_15_percent / il_16_concentration_picogram_per_milliliter / il_16_percent / il_17a_concentration_picogram_per_milliliter / il_17a_percent / il_17e_per_il_25_concentration_picogram_per_milliliter / il_17e_per_il_25_percent / il_17f_concentration_picogram_per_milliliter / il_17f_percent / il_18_concentration_picogram_per_milliliter / il_18_percent / il_1ra_concentration_picogram_per_milliliter / il_1ra_percent / il_1α_concentration_picogram_per_milliliter / il_1α_percent / il_1β_concentration_picogram_per_milliliter / il_1β_percent / il_20_concentration_picogram_per_milliliter / il_20_percent / il_21_concentration_picogram_per_milliliter / il_21_percent / il_22_concentration_picogram_per_milliliter / il_22_percent / il_23_concentration_picogram_per_milliliter / il_23_percent / il_27_concentration_picogram_per_milliliter / il_27_percent / il_28a_concentration_picogram_per_milliliter / il_28a_percent / il_2_concentration_picogram_per_milliliter / il_2_percent / il_33_concentration_picogram_per_milliliter / il_33_percent / il_3_concentration_picogram_per_milliliter / il_3_percent / il_4_concentration_picogram_per_milliliter / il_4_percent / il_5_concentration_picogram_per_milliliter / il_5_percent / il_6_concentration_picogram_per_milliliter / il_6_percent / il_7_concentration_picogram_per_milliliter / il_7_percent / il_8_concentration_picogram_per_milliliter / il_8_percent / il_9_concentration_picogram_per_milliliter / il_9_percent / ip_10_concentration_picogram_per_milliliter / ip_10_percent / lif_concentration_picogram_per_milliliter / lif_percent / m_csf_concentration_picogram_per_milliliter / m_csf_percent / mcp_1_concentration_picogram_per_milliliter / mcp_1_percent / mcp_2_concentration_picogram_per_milliliter / mcp_2_percent / mcp_3_concentration_picogram_per_milliliter / mcp_3_percent / mcp_4_concentration_picogram_per_milliliter / mcp_4_percent / mdc_concentration_picogram_per_milliliter / mdc_percent / mig_per_cxcl9_concentration_picogram_per_milliliter / mig_per_cxcl9_percent / mip_1α_concentration_picogram_per_milliliter / mip_1α_percent / mip_1β_concentration_picogram_per_milliliter / mip_1β_percent / mip_1δ_concentration_picogram_per_milliliter / mip_1δ_percent / pdgf_aa_concentration_picogram_per_milliliter / pdgf_aa_percent / pdgf_ab_per_bb_concentration_picogram_per_milliliter / pdgf_ab_per_bb_percent / rantes_concentration_picogram_per_milliliter / rantes_percent / scd40l_concentration_picogram_per_milliliter / scd40l_percent / scf_concentration_picogram_per_milliliter / scf_percent / sdf_1α_plus_β_concentration_picogram_per_milliliter / sdf_1α_plus_β_percent / tarc_concentration_picogram_per_milliliter / tarc_percent / tgfα_concentration_picogram_per_milliliter / tgfα_percent / tnfα_concentration_picogram_per_milliliter / tnfα_percent / tnfβ_concentration_picogram_per_milliliter / tnfβ_percent / tpo_concentration_picogram_per_milliliter / tpo_percent / trail_concentration_picogram_per_milliliter / trail_percent / tslp_concentration_picogram_per_milliliter / tslp_percent / vegf_a_concentration_picogram_per_milliliter / vegf_a_percent |  |

## Numeric measurements detected
| table | measurement_column | analyte | unit | n_numeric | n_missing_or_nonfinite | mean | std | min | median | max |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| LSDS-8_Comprehensive_Metabolic_Panel_CMP.upload_SUBMITTED | VALUE | GLUCOSE | mg/dL | 28 | 0 | 76.42857142857143 | 16.226244337215103 | 36.0 | 80.0 | 103.0 |
| LSDS-8_Comprehensive_Metabolic_Panel_CMP.upload_SUBMITTED | VALUE | UREA NITROGEN (BUN) | mg/dL | 28 | 0 | 20.357142857142858 | 3.992718239720772 | 14.0 | 19.0 | 28.0 |
| LSDS-8_Comprehensive_Metabolic_Panel_CMP.upload_SUBMITTED | VALUE | CREATININE | mg/dL | 28 | 0 | 1.0675000000000001 | 0.14346570115329801 | 0.82 | 1.08 | 1.37 |
| LSDS-8_Comprehensive_Metabolic_Panel_CMP.upload_SUBMITTED | VALUE | eGFR NON-AFR. AMERICAN | mL/min/1.73m2 | 28 | 0 | 76.17857142857143 | 7.72707395834102 | 63.0 | 77.0 | 88.0 |
| LSDS-8_Comprehensive_Metabolic_Panel_CMP.upload_SUBMITTED | VALUE | eGFR AFRICAN AMERICAN | mL/min/1.73m2 | 28 | 0 | 88.21428571428571 | 8.945750668694888 | 73.0 | 89.0 | 102.0 |
| LSDS-8_Comprehensive_Metabolic_Panel_CMP.upload_SUBMITTED | VALUE | BUN/CREATININE RATIO | (calc) | 6 | 21 | 21.666666666666668 | 3.5590260840104366 | 15.0 | 22.5 | 25.0 |
| LSDS-8_Comprehensive_Metabolic_Panel_CMP.upload_SUBMITTED | VALUE | SODIUM | mmol/L | 28 | 0 | 139.28571428571428 | 1.8024087351866804 | 136.0 | 139.0 | 143.0 |
| LSDS-8_Comprehensive_Metabolic_Panel_CMP.upload_SUBMITTED | VALUE | POTASSIUM | mmol/L | 28 | 0 | 4.017857142857143 | 0.5192969402656944 | 3.0 | 4.0 | 5.9 |
| LSDS-8_Comprehensive_Metabolic_Panel_CMP.upload_SUBMITTED | VALUE | CHLORIDE | mmol/L | 28 | 0 | 102.42857142857143 | 1.9134721480532872 | 97.0 | 102.5 | 106.0 |
| LSDS-8_Comprehensive_Metabolic_Panel_CMP.upload_SUBMITTED | VALUE | CARBON DIOXIDE | mmol/L | 28 | 0 | 23.25 | 2.1879298519461354 | 19.0 | 23.0 | 28.0 |
| LSDS-8_Comprehensive_Metabolic_Panel_CMP.upload_SUBMITTED | VALUE | CALCIUM | mg/dL | 28 | 0 | 9.728571428571428 | 0.3089494059708408 | 9.2 | 9.7 | 10.3 |
| LSDS-8_Comprehensive_Metabolic_Panel_CMP.upload_SUBMITTED | VALUE | PROTEIN; TOTAL | g/dL | 28 | 0 | 7.375 | 0.3787161548256504 | 6.8 | 7.3 | 8.8 |
| LSDS-8_Comprehensive_Metabolic_Panel_CMP.upload_SUBMITTED | VALUE | ALBUMIN | g/dL | 28 | 0 | 4.589285714285714 | 0.2726268453865041 | 4.2 | 4.55 | 5.1 |
| LSDS-8_Comprehensive_Metabolic_Panel_CMP.upload_SUBMITTED | VALUE | GLOBULIN | g/dL | 28 | 0 | 2.785714285714286 | 0.29528929407577104 | 2.3 | 2.8 | 3.9 |
| LSDS-8_Comprehensive_Metabolic_Panel_CMP.upload_SUBMITTED | VALUE | ALBUMIN/GLOBULIN RATIO | (calc) | 28 | 0 | 1.6642857142857141 | 0.21809662438042818 | 1.3 | 1.6 | 2.2 |
| LSDS-8_Comprehensive_Metabolic_Panel_CMP.upload_SUBMITTED | VALUE | BILIRUBIN; TOTAL | mg/dL | 27 | 1 | 0.588888888888889 | 0.2805671910932366 | 0.2 | 0.5 | 1.2 |
| LSDS-8_Comprehensive_Metabolic_Panel_CMP.upload_SUBMITTED | VALUE | ALKALINE PHOSPHATASE | U/L | 28 | 0 | 54.17857142857143 | 11.633456132521477 | 31.0 | 53.0 | 78.0 |
| LSDS-8_Comprehensive_Metabolic_Panel_CMP.upload_SUBMITTED | VALUE | AST | U/L | 28 | 0 | 23.392857142857142 | 10.657424071073077 | 12.0 | 18.5 | 48.0 |
| LSDS-8_Comprehensive_Metabolic_Panel_CMP.upload_SUBMITTED | VALUE | ALT | U/L | 28 | 0 | 20.0 | 9.93683756236061 | 9.0 | 16.0 | 43.0 |
| LSDS-8_Comprehensive_Metabolic_Panel_CMP.upload_SUBMITTED | RANGE_MIN | GLUCOSE | mg/dL | 28 | 0 | 65.0 | 0.0 | 65.0 | 65.0 | 65.0 |
| LSDS-8_Comprehensive_Metabolic_Panel_CMP.upload_SUBMITTED | RANGE_MIN | UREA NITROGEN (BUN) | mg/dL | 28 | 0 | 7.0 | 0.0 | 7.0 | 7.0 | 7.0 |
| LSDS-8_Comprehensive_Metabolic_Panel_CMP.upload_SUBMITTED | RANGE_MIN | CREATININE | mg/dL | 28 | 0 | 0.5607142857142857 | 0.04973474613934379 | 0.5 | 0.6 | 0.6 |
| LSDS-8_Comprehensive_Metabolic_Panel_CMP.upload_SUBMITTED | RANGE_MIN | eGFR NON-AFR. AMERICAN | mL/min/1.73m2 | 28 | 0 | 60.0 | 0.0 | 60.0 | 60.0 | 60.0 |
| LSDS-8_Comprehensive_Metabolic_Panel_CMP.upload_SUBMITTED | RANGE_MIN | eGFR AFRICAN AMERICAN | mL/min/1.73m2 | 28 | 0 | 60.0 | 0.0 | 60.0 | 60.0 | 60.0 |
| LSDS-8_Comprehensive_Metabolic_Panel_CMP.upload_SUBMITTED | RANGE_MIN | BUN/CREATININE RATIO | (calc) | 27 | 0 | 6.0 | 0.0 | 6.0 | 6.0 | 6.0 |
| LSDS-8_Comprehensive_Metabolic_Panel_CMP.upload_SUBMITTED | RANGE_MIN | SODIUM | mmol/L | 28 | 0 | 135.0 | 0.0 | 135.0 | 135.0 | 135.0 |
| LSDS-8_Comprehensive_Metabolic_Panel_CMP.upload_SUBMITTED | RANGE_MIN | POTASSIUM | mmol/L | 28 | 0 | 3.5 | 0.0 | 3.5 | 3.5 | 3.5 |
| LSDS-8_Comprehensive_Metabolic_Panel_CMP.upload_SUBMITTED | RANGE_MIN | CHLORIDE | mmol/L | 28 | 0 | 98.0 | 0.0 | 98.0 | 98.0 | 98.0 |
| LSDS-8_Comprehensive_Metabolic_Panel_CMP.upload_SUBMITTED | RANGE_MIN | CARBON DIOXIDE | mmol/L | 28 | 0 | 20.0 | 0.0 | 20.0 | 20.0 | 20.0 |
| LSDS-8_Comprehensive_Metabolic_Panel_CMP.upload_SUBMITTED | RANGE_MIN | CALCIUM | mg/dL | 28 | 0 | 8.599999999999998 | 1.8089532617342584e-15 | 8.6 | 8.6 | 8.6 |
| LSDS-8_Comprehensive_Metabolic_Panel_CMP.upload_SUBMITTED | RANGE_MIN | PROTEIN; TOTAL | g/dL | 28 | 0 | 6.099999999999999 | 9.044766308671292e-16 | 6.1 | 6.1 | 6.1 |
| LSDS-8_Comprehensive_Metabolic_Panel_CMP.upload_SUBMITTED | RANGE_MIN | ALBUMIN | g/dL | 28 | 0 | 3.599999999999999 | 9.044766308671292e-16 | 3.6 | 3.6 | 3.6 |
| LSDS-8_Comprehensive_Metabolic_Panel_CMP.upload_SUBMITTED | RANGE_MIN | GLOBULIN | g/dL | 28 | 0 | 1.8999999999999997 | 2.261191577167823e-16 | 1.9 | 1.9 | 1.9 |
| LSDS-8_Comprehensive_Metabolic_Panel_CMP.upload_SUBMITTED | RANGE_MIN | ALBUMIN/GLOBULIN RATIO | (calc) | 28 | 0 | 1.0 | 0.0 | 1.0 | 1.0 | 1.0 |
| LSDS-8_Comprehensive_Metabolic_Panel_CMP.upload_SUBMITTED | RANGE_MIN | BILIRUBIN; TOTAL | mg/dL | 28 | 0 | 0.20000000000000004 | 2.826489471459779e-17 | 0.2 | 0.2 | 0.2 |
| LSDS-8_Comprehensive_Metabolic_Panel_CMP.upload_SUBMITTED | RANGE_MIN | ALKALINE PHOSPHATASE | U/L | 28 | 0 | 35.535714285714285 | 1.9337574794730568 | 31.0 | 36.0 | 37.0 |
| LSDS-8_Comprehensive_Metabolic_Panel_CMP.upload_SUBMITTED | RANGE_MIN | AST | U/L | 28 | 0 | 10.0 | 0.0 | 10.0 | 10.0 | 10.0 |
| LSDS-8_Comprehensive_Metabolic_Panel_CMP.upload_SUBMITTED | RANGE_MIN | ALT | U/L | 28 | 0 | 7.821428571428571 | 1.492042384180314 | 6.0 | 9.0 | 9.0 |
| LSDS-8_Comprehensive_Metabolic_Panel_CMP.upload_SUBMITTED | RANGE_MAX | GLUCOSE | mg/dL | 28 | 0 | 99.0 | 0.0 | 99.0 | 99.0 | 99.0 |
| LSDS-8_Comprehensive_Metabolic_Panel_CMP.upload_SUBMITTED | RANGE_MAX | UREA NITROGEN (BUN) | mg/dL | 28 | 0 | 25.0 | 0.0 | 25.0 | 25.0 | 25.0 |
| LSDS-8_Comprehensive_Metabolic_Panel_CMP.upload_SUBMITTED | RANGE_MAX | CREATININE | mg/dL | 28 | 0 | 1.2392857142857145 | 0.14099983113802791 | 1.05 | 1.35 | 1.35 |
| LSDS-8_Comprehensive_Metabolic_Panel_CMP.upload_SUBMITTED | RANGE_MAX | eGFR NON-AFR. AMERICAN | mL/min/1.73m2 | 0 | 28 |  |  |  |  |  |
| LSDS-8_Comprehensive_Metabolic_Panel_CMP.upload_SUBMITTED | RANGE_MAX | eGFR AFRICAN AMERICAN | mL/min/1.73m2 | 0 | 28 |  |  |  |  |  |
| LSDS-8_Comprehensive_Metabolic_Panel_CMP.upload_SUBMITTED | RANGE_MAX | BUN/CREATININE RATIO | (calc) | 27 | 0 | 22.0 | 0.0 | 22.0 | 22.0 | 22.0 |
| LSDS-8_Comprehensive_Metabolic_Panel_CMP.upload_SUBMITTED | RANGE_MAX | SODIUM | mmol/L | 28 | 0 | 146.0 | 0.0 | 146.0 | 146.0 | 146.0 |
| LSDS-8_Comprehensive_Metabolic_Panel_CMP.upload_SUBMITTED | RANGE_MAX | POTASSIUM | mmol/L | 28 | 0 | 5.300000000000002 | 1.8089532617342584e-15 | 5.3 | 5.3 | 5.3 |
| LSDS-8_Comprehensive_Metabolic_Panel_CMP.upload_SUBMITTED | RANGE_MAX | CHLORIDE | mmol/L | 28 | 0 | 110.0 | 0.0 | 110.0 | 110.0 | 110.0 |
| LSDS-8_Comprehensive_Metabolic_Panel_CMP.upload_SUBMITTED | RANGE_MAX | CARBON DIOXIDE | mmol/L | 28 | 0 | 32.0 | 0.0 | 32.0 | 32.0 | 32.0 |
| LSDS-8_Comprehensive_Metabolic_Panel_CMP.upload_SUBMITTED | RANGE_MAX | CALCIUM | mg/dL | 28 | 0 | 10.310714285714285 | 0.06288900106557971 | 10.2 | 10.3 | 10.4 |
| LSDS-8_Comprehensive_Metabolic_Panel_CMP.upload_SUBMITTED | RANGE_MAX | PROTEIN; TOTAL | g/dL | 28 | 0 | 8.099999999999998 | 1.8089532617342584e-15 | 8.1 | 8.1 | 8.1 |
| LSDS-8_Comprehensive_Metabolic_Panel_CMP.upload_SUBMITTED | RANGE_MAX | ALBUMIN | g/dL | 28 | 0 | 5.1 | 0.0 | 5.1 | 5.1 | 5.1 |
| LSDS-8_Comprehensive_Metabolic_Panel_CMP.upload_SUBMITTED | RANGE_MAX | GLOBULIN | g/dL | 28 | 0 | 3.7000000000000006 | 4.522383154335646e-16 | 3.7 | 3.7 | 3.7 |
| LSDS-8_Comprehensive_Metabolic_Panel_CMP.upload_SUBMITTED | RANGE_MAX | ALBUMIN/GLOBULIN RATIO | (calc) | 28 | 0 | 2.5 | 0.0 | 2.5 | 2.5 | 2.5 |
| LSDS-8_Comprehensive_Metabolic_Panel_CMP.upload_SUBMITTED | RANGE_MAX | BILIRUBIN; TOTAL | mg/dL | 28 | 0 | 1.2 | 0.0 | 1.2 | 1.2 | 1.2 |
| LSDS-8_Comprehensive_Metabolic_Panel_CMP.upload_SUBMITTED | RANGE_MAX | ALKALINE PHOSPHATASE | U/L | 28 | 0 | 135.03571428571428 | 10.703001112035485 | 125.0 | 130.0 | 153.0 |
| LSDS-8_Comprehensive_Metabolic_Panel_CMP.upload_SUBMITTED | RANGE_MAX | AST | U/L | 28 | 0 | 37.32142857142857 | 3.7223406756797677 | 30.0 | 40.0 | 40.0 |
| LSDS-8_Comprehensive_Metabolic_Panel_CMP.upload_SUBMITTED | RANGE_MAX | ALT | U/L | 28 | 0 | 39.32142857142857 | 8.454906843688446 | 29.0 | 46.0 | 46.0 |
| LSDS-8_Comprehensive_Metabolic_Panel_CMP_TRANSFORMED | albumin_value_gram_per_deciliter | albumin_value_gram_per_deciliter |  | 28 | 0 | 4.589285714285714 | 0.2726268453865041 | 4.2 | 4.55 | 5.1 |
| LSDS-8_Comprehensive_Metabolic_Panel_CMP_TRANSFORMED | albumin_range_min_gram_per_deciliter | albumin_range_min_gram_per_deciliter |  | 28 | 0 | 3.599999999999999 | 9.044766308671292e-16 | 3.6 | 3.6 | 3.6 |
| LSDS-8_Comprehensive_Metabolic_Panel_CMP_TRANSFORMED | albumin_range_max_gram_per_deciliter | albumin_range_max_gram_per_deciliter |  | 28 | 0 | 5.1 | 0.0 | 5.1 | 5.1 | 5.1 |
| LSDS-8_Comprehensive_Metabolic_Panel_CMP_TRANSFORMED | albumin_to_globulin_ratio_value | albumin_to_globulin_ratio_value |  | 28 | 0 | 1.6642857142857144 | 0.21809662438042815 | 1.3 | 1.6 | 2.2 |
| LSDS-8_Comprehensive_Metabolic_Panel_CMP_TRANSFORMED | albumin_to_globulin_ratio_range_min | albumin_to_globulin_ratio_range_min |  | 28 | 0 | 1.0 | 0.0 | 1.0 | 1.0 | 1.0 |
| LSDS-8_Comprehensive_Metabolic_Panel_CMP_TRANSFORMED | albumin_to_globulin_ratio_range_max | albumin_to_globulin_ratio_range_max |  | 28 | 0 | 2.5 | 0.0 | 2.5 | 2.5 | 2.5 |
| LSDS-8_Comprehensive_Metabolic_Panel_CMP_TRANSFORMED | alkaline_phosphatase_value_units_per_liter | alkaline_phosphatase_value_units_per_liter |  | 28 | 0 | 54.17857142857143 | 11.633456132521477 | 31.0 | 53.0 | 78.0 |
| LSDS-8_Comprehensive_Metabolic_Panel_CMP_TRANSFORMED | alkaline_phosphatase_range_min_units_per_liter | alkaline_phosphatase_range_min_units_per_liter |  | 28 | 0 | 35.535714285714285 | 1.933757479473057 | 31.0 | 36.0 | 37.0 |
| LSDS-8_Comprehensive_Metabolic_Panel_CMP_TRANSFORMED | alkaline_phosphatase_range_max_units_per_liter | alkaline_phosphatase_range_max_units_per_liter |  | 28 | 0 | 135.03571428571428 | 10.703001112035485 | 125.0 | 130.0 | 153.0 |
| LSDS-8_Comprehensive_Metabolic_Panel_CMP_TRANSFORMED | alt_value_units_per_liter | alt_value_units_per_liter |  | 28 | 0 | 20.0 | 9.93683756236061 | 9.0 | 16.0 | 43.0 |
| LSDS-8_Comprehensive_Metabolic_Panel_CMP_TRANSFORMED | alt_range_min_units_per_liter | alt_range_min_units_per_liter |  | 28 | 0 | 7.821428571428571 | 1.4920423841803143 | 6.0 | 9.0 | 9.0 |
| LSDS-8_Comprehensive_Metabolic_Panel_CMP_TRANSFORMED | alt_max_units_per_liter | alt_max_units_per_liter |  | 28 | 0 | 39.32142857142857 | 8.454906843688446 | 29.0 | 46.0 | 46.0 |
| LSDS-8_Comprehensive_Metabolic_Panel_CMP_TRANSFORMED | ast_value_units_per_liter | ast_value_units_per_liter |  | 28 | 0 | 23.392857142857142 | 10.657424071073077 | 12.0 | 18.5 | 48.0 |
| LSDS-8_Comprehensive_Metabolic_Panel_CMP_TRANSFORMED | ast_range_min_units_per_liter | ast_range_min_units_per_liter |  | 28 | 0 | 10.0 | 0.0 | 10.0 | 10.0 | 10.0 |
| LSDS-8_Comprehensive_Metabolic_Panel_CMP_TRANSFORMED | ast_max_units_per_liter | ast_max_units_per_liter |  | 28 | 0 | 37.32142857142857 | 3.722340675679768 | 30.0 | 40.0 | 40.0 |
| LSDS-8_Comprehensive_Metabolic_Panel_CMP_TRANSFORMED | total_bilirubin_value_milligram_per_deciliter | total_bilirubin_value_milligram_per_deciliter |  | 27 | 1 | 0.5888888888888888 | 0.2805671910932365 | 0.2 | 0.5 | 1.2 |
| LSDS-8_Comprehensive_Metabolic_Panel_CMP_TRANSFORMED | total_bilirubin_range_min_milligram_per_deciliter | total_bilirubin_range_min_milligram_per_deciliter |  | 28 | 0 | 0.20000000000000004 | 2.826489471459779e-17 | 0.2 | 0.2 | 0.2 |
| LSDS-8_Comprehensive_Metabolic_Panel_CMP_TRANSFORMED | total_bilirubin_range_max_milligram_per_deciliter | total_bilirubin_range_max_milligram_per_deciliter |  | 28 | 0 | 1.2 | 0.0 | 1.2 | 1.2 | 1.2 |
| LSDS-8_Comprehensive_Metabolic_Panel_CMP_TRANSFORMED | bun_to_creatinine_ratio_value | bun_to_creatinine_ratio_value |  | 6 | 22 | 21.666666666666668 | 3.5590260840104366 | 15.0 | 22.5 | 25.0 |
| LSDS-8_Comprehensive_Metabolic_Panel_CMP_TRANSFORMED | bun_to_creatinine_ratio_range_min | bun_to_creatinine_ratio_range_min |  | 27 | 1 | 6.0 | 0.0 | 6.0 | 6.0 | 6.0 |
| LSDS-8_Comprehensive_Metabolic_Panel_CMP_TRANSFORMED | bun_to_creatinine_ratio_range_max | bun_to_creatinine_ratio_range_max |  | 27 | 1 | 22.0 | 0.0 | 22.0 | 22.0 | 22.0 |
| LSDS-8_Comprehensive_Metabolic_Panel_CMP_TRANSFORMED | calcium_value_milligram_per_deciliter | calcium_value_milligram_per_deciliter |  | 28 | 0 | 9.72857142857143 | 0.3089494059708408 | 9.2 | 9.7 | 10.3 |
| LSDS-8_Comprehensive_Metabolic_Panel_CMP_TRANSFORMED | calcium_range_min_milligram_per_deciliter | calcium_range_min_milligram_per_deciliter |  | 28 | 0 | 8.599999999999998 | 1.8089532617342584e-15 | 8.6 | 8.6 | 8.6 |
| LSDS-8_Comprehensive_Metabolic_Panel_CMP_TRANSFORMED | calcium_range_max_milligram_per_deciliter | calcium_range_max_milligram_per_deciliter |  | 28 | 0 | 10.310714285714287 | 0.06288900106557971 | 10.2 | 10.3 | 10.4 |
| LSDS-8_Comprehensive_Metabolic_Panel_CMP_TRANSFORMED | carbon_dioxide_value_millimol_per_liter | carbon_dioxide_value_millimol_per_liter |  | 28 | 0 | 23.25 | 2.1879298519461354 | 19.0 | 23.0 | 28.0 |
| LSDS-8_Comprehensive_Metabolic_Panel_CMP_TRANSFORMED | carbon_dioxide_range_min_millimol_per_liter | carbon_dioxide_range_min_millimol_per_liter |  | 28 | 0 | 20.0 | 0.0 | 20.0 | 20.0 | 20.0 |
| LSDS-8_Comprehensive_Metabolic_Panel_CMP_TRANSFORMED | carbon_dioxide_range_max_millimol_per_liter | carbon_dioxide_range_max_millimol_per_liter |  | 28 | 0 | 32.0 | 0.0 | 32.0 | 32.0 | 32.0 |
| LSDS-8_Comprehensive_Metabolic_Panel_CMP_TRANSFORMED | chloride_value_millimol_per_liter | chloride_value_millimol_per_liter |  | 28 | 0 | 102.42857142857143 | 1.9134721480532872 | 97.0 | 102.5 | 106.0 |
| LSDS-8_Comprehensive_Metabolic_Panel_CMP_TRANSFORMED | chloride_range_min_millimol_per_liter | chloride_range_min_millimol_per_liter |  | 28 | 0 | 98.0 | 0.0 | 98.0 | 98.0 | 98.0 |
| LSDS-8_Comprehensive_Metabolic_Panel_CMP_TRANSFORMED | chloride_range_max_millimol_per_liter | chloride_range_max_millimol_per_liter |  | 28 | 0 | 110.0 | 0.0 | 110.0 | 110.0 | 110.0 |
| LSDS-8_Comprehensive_Metabolic_Panel_CMP_TRANSFORMED | creatinine_value_milligram_per_deciliter | creatinine_value_milligram_per_deciliter |  | 28 | 0 | 1.0675000000000001 | 0.14346570115329801 | 0.82 | 1.08 | 1.37 |
| LSDS-8_Comprehensive_Metabolic_Panel_CMP_TRANSFORMED | creatinine_range_min_milligram_per_deciliter | creatinine_range_min_milligram_per_deciliter |  | 28 | 0 | 0.5607142857142857 | 0.04973474613934379 | 0.5 | 0.6 | 0.6 |
| LSDS-8_Comprehensive_Metabolic_Panel_CMP_TRANSFORMED | creatinine_range_max_milligram_per_deciliter | creatinine_range_max_milligram_per_deciliter |  | 28 | 0 | 1.2392857142857145 | 0.14099983113802794 | 1.05 | 1.35 | 1.35 |
| LSDS-8_Comprehensive_Metabolic_Panel_CMP_TRANSFORMED | egfr_african_american_value_milliliter_per_minute_per_1.73_meter_squared | egfr_african_american_value_milliliter_per_minute_per_1.73_meter_squared |  | 28 | 0 | 88.21428571428571 | 8.945750668694888 | 73.0 | 89.0 | 102.0 |
| LSDS-8_Comprehensive_Metabolic_Panel_CMP_TRANSFORMED | egfr_african_american_range_min_milliliter_per_minute_per_1.73_meter_squared | egfr_african_american_range_min_milliliter_per_minute_per_1.73_meter_squared |  | 28 | 0 | 60.0 | 0.0 | 60.0 | 60.0 | 60.0 |
| LSDS-8_Comprehensive_Metabolic_Panel_CMP_TRANSFORMED | egfr_non_african_american_value_milliliter_per_minute_per_1.73_meter_squared | egfr_non_african_american_value_milliliter_per_minute_per_1.73_meter_squared |  | 28 | 0 | 76.17857142857143 | 7.72707395834102 | 63.0 | 77.0 | 88.0 |
| LSDS-8_Comprehensive_Metabolic_Panel_CMP_TRANSFORMED | egfr_non_african_american_range_min_milliliter_per_minute_per_1.73_meter_squared | egfr_non_african_american_range_min_milliliter_per_minute_per_1.73_meter_squared |  | 28 | 0 | 60.0 | 0.0 | 60.0 | 60.0 | 60.0 |
| LSDS-8_Comprehensive_Metabolic_Panel_CMP_TRANSFORMED | globulin_value_gram_per_deciliter | globulin_value_gram_per_deciliter |  | 28 | 0 | 2.7857142857142856 | 0.29528929407577104 | 2.3 | 2.8 | 3.9 |
| LSDS-8_Comprehensive_Metabolic_Panel_CMP_TRANSFORMED | globulin_range_min_gram_per_deciliter | globulin_range_min_gram_per_deciliter |  | 28 | 0 | 1.8999999999999997 | 2.261191577167823e-16 | 1.9 | 1.9 | 1.9 |
| LSDS-8_Comprehensive_Metabolic_Panel_CMP_TRANSFORMED | globulin_range_max_gram_per_deciliter | globulin_range_max_gram_per_deciliter |  | 28 | 0 | 3.7000000000000006 | 4.522383154335646e-16 | 3.7 | 3.7 | 3.7 |
| LSDS-8_Comprehensive_Metabolic_Panel_CMP_TRANSFORMED | glucose_value_milligram_per_deciliter | glucose_value_milligram_per_deciliter |  | 28 | 0 | 76.42857142857143 | 16.226244337215103 | 36.0 | 80.0 | 103.0 |
| LSDS-8_Comprehensive_Metabolic_Panel_CMP_TRANSFORMED | glucose_range_min_milligram_per_deciliter | glucose_range_min_milligram_per_deciliter |  | 28 | 0 | 65.0 | 0.0 | 65.0 | 65.0 | 65.0 |
| LSDS-8_Comprehensive_Metabolic_Panel_CMP_TRANSFORMED | glucose_range_max_milligram_per_deciliter | glucose_range_max_milligram_per_deciliter |  | 28 | 0 | 99.0 | 0.0 | 99.0 | 99.0 | 99.0 |

## Subject and timepoint candidates
| table | column | n_unique | timepoint_like_values | subject_like_values | sample_values |
| --- | --- | --- | --- | --- | --- |
| LSDS-8_Comprehensive_Metabolic_Panel_CMP.upload_SUBMITTED | SUBJECT_ID | 4 |  | C001 / C002 / C003 / C004 | C001 / C002 / C004 / C003 |
| LSDS-8_Comprehensive_Metabolic_Panel_CMP.upload_SUBMITTED | timepoint | 7 | L-3 / L-44 / L-92 / R+1 / R+194 / R+45 / R+82 |  | L-92 / L-44 / L-3 / R+1 / R+45 / R+82 / R+194 |
| LSDS-8_Comprehensive_Metabolic_Panel_CMP_TRANSFORMED | Sample Name | 28 |  |  | C001_serum_L-3 / C001_serum_L-44 / C001_serum_L-92 / C001_serum_R+1 / C001_serum_R+194 / C001_serum_R+45 / C001_serum_R+82 / C002_serum_L-3 / C002_serum_L-44 / C002_serum_L-92 / C002_serum_R+1 / C002_serum_R+194 |
| LSDS-8_Multiplex_serum.cardiovascular.EvePanel_SUBMITTED | Timepoint | 7 | L-3 / L-44 / L-92 / R+1 / R+194 / R+45 / R+82 |  | L-92 / L-44 / L-3 / R+1 / R+45 / R+82 / R+194 |
| LSDS-8_Multiplex_serum.cardiovascular.EvePanel_SUBMITTED | ID | 4 |  | C001 / C002 / C003 / C004 | C001 / C002 / C003 / C004 |
| LSDS-8_Multiplex_serum.cardiovascular.EvePanel_SUBMITTED | Timepoint2 | 5 | Preflight / R+1 / R+194 / R+45 / R+82 |  | Preflight / R+1 / R+45 / R+82 / R+194 |
| LSDS-8_Multiplex_serum.immune.AlamarPanel_TRANSFORMED | Sample ID | 27 |  |  | C001_serum_L-92 / C002_serum_L-92 / C003_serum_L-92 / C004_serum_L-92 / C001_serum_L-44 / C002_serum_L-44 / C004_serum_L-44 / C001_serum_L-3 / C002_serum_L-3 / C003_serum_L-3 / C004_serum_L-3 / C001_serum_R+1 |
| LSDS-8_Multiplex_serum.immune.EvePanel_SUBMITTED | Timepoint | 7 | L-3 / L-44 / L-92 / R+1 / R+194 / R+45 / R+82 |  | L-92 / L-44 / L-3 / R+1 / R+45 / R+82 / R+194 |
| LSDS-8_Multiplex_serum.immune.EvePanel_SUBMITTED | ID | 4 |  | C001 / C002 / C003 / C004 | C001 / C002 / C003 / C004 |
| LSDS-8_Multiplex_serum.immune.EvePanel_SUBMITTED | Timepoint2 | 5 | Preflight / R+1 / R+194 / R+45 / R+82 |  | Preflight / R+1 / R+45 / R+82 / R+194 |
| LSDS-8_Multiplex_serum_cardiovascular_EvePanel_TRANSFORMED | Sample Name | 28 |  |  | C001_serum_L-3 / C001_serum_L-44 / C001_serum_L-92 / C001_serum_R+1 / C001_serum_R+194 / C001_serum_R+45 / C001_serum_R+82 / C002_serum_L-3 / C002_serum_L-44 / C002_serum_L-92 / C002_serum_R+1 / C002_serum_R+194 |
| LSDS-8_Multiplex_serum_immune_EvePanel_TRANSFORMED | Sample Name | 28 |  |  | C001_serum_L-3 / C001_serum_L-44 / C001_serum_L-92 / C001_serum_R+1 / C001_serum_R+194 / C001_serum_R+45 / C001_serum_R+82 / C002_serum_L-3 / C002_serum_L-44 / C002_serum_L-92 / C002_serum_R+1 / C002_serum_R+194 |

## Generated files
- `reports/tables/osd575_eda_file_inventory.csv`
- `reports/tables/osd575_eda_load_log.csv`
- `reports/tables/osd575_eda_table_schema.csv`
- `reports/tables/osd575_assay_provenance.csv`
- `reports/tables/osd575_column_role_candidates.csv`
- `reports/tables/osd575_numeric_measurement_summary.csv`
- `reports/tables/osd575_column_missingness.csv`
- `reports/tables/osd575_subject_timepoint_candidates.csv`
- `reports/tables/osd575_submitted_transformed_structural_comparison.csv`
- `reports/tables/osd575_timecourse_plot_inventory.csv`
- Figures are saved under `reports/figures/`.

## Source
NASA OSDR, OSD-575: https://osdr.nasa.gov/bio/repo/data/studies/OSD-575
Study DOI: https://doi.org/10.26030/mc5d-p710
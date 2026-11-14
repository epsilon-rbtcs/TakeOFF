# Dataset Registry — Astronaut Health Monitoring & Decision-Support System

## Architecture context

This registry supports an independent dual-client hackathon prototype: an offline-first Tauri crew desktop client targeting SQLCipher-encrypted SQLite (encryption not implemented or verified), plus a hosted ground console backed by one FastAPI/PostgreSQL service. The shared data model uses client-generated stable IDs and a store-and-forward event protocol. Communication states are simulated (`LIVE`, `DELAYED`, `BLACKOUT`); the prototype has no direct access to NASA TDRS, DSN, spacecraft, or NASA infrastructure. The full architecture, local/ground data designs, and API contract are specified in the project [README](../../README.md), [crew SQLite schema](../../crew-local-schema.sql), [ground PostgreSQL schema](../../schema.sql), and [OpenAPI contract](../../openapi.yaml).

The NASA CHP-IDSP and CEHP public descriptions inform architecture patterns only. They are not datasets, APIs, integration targets, nor evidence that this project interoperates with those systems.

---

**Registry version:** 1.1  
**Project specification:** v0.3 (14 November 2026)  
**Last source check:** 14 November 2026  
**Status:** Research catalogue; dataset files have not necessarily been downloaded or processed.

This registry records candidate datasets, their provenance, access and licensing notes, relevant fields, intended software module, preprocessing needs, limitations, and permitted project role. It is a planning document, not a claim that every listed dataset has been integrated into the application.

---

## 1. Dataset-use policy

### 1.1 Challenge-resource classification

The official [2026 challenge statement](https://www.spaceappschallenge.org/2026/challenges/health-monitoring-software/) describes the astronaut health-monitoring problem but does not name a mandatory downloadable dataset in the statement. The challenge Resources-tab list was not independently retrievable/verified during this revision. Therefore this registry makes **no claim that any listed dataset satisfies a challenge-specific resource or eligibility requirement**.

Classification as of 14 November 2026:

- **Challenge-listed NASA resources verified:** none. Recheck the official challenge Resources tab and retain a screenshot or source record before making this classification.
- **Additional NASA resources:** OSDR studies (including OSD-575), EDA, and RadLab are NASA resources considered as optional research/context inputs. Their presence in this registry does not make them challenge-listed.
- **Third-party resources:** separately identified by provider and licence notes below.

The team may choose to use additional NASA datasets for scientific context or pipeline demonstrations. That is a project design choice, not an asserted challenge requirement or eligibility determination.

**Optional additional NASA resource candidates:**

1. **NASA OSDR OSD-575 (Inspiration4 blood serum):** import and display a real spaceflight biomarker time series in a clearly labelled research-evidence view. Do not use this small cohort to train a generalized astronaut-health predictor.
2. **NASA Environmental Data Application (EDA):** use a selected ISS mission's downloadable environmental telemetry to demonstrate contextual cabin-environment monitoring.
3. **NASA RadLab API:** where a suitable instrument/mission time series is selected, ingest and display actual radiation measurements with instrument metadata and physical units.

Preserve the original NASA source, version, mission, instrument, variable definitions, and access date. Before submission, verify the challenge's exact resource guidance; do not infer eligibility from provider identity or from this registry.

### 1.2 Dataset roles

Use one or more of these role labels for every dataset:

- **MODEL_TRAINING:** data used to fit a model for a defined target and population.
- **MODEL_VALIDATION:** held-out or external data used to evaluate a model. Do not use the same subject/session in training and validation.
- **SCIENTIFIC_REFERENCE:** supports scientific interpretation, plots, evidence, or biomarker context; not used to fit a predictive model.
- **ENVIRONMENTAL_FEED:** time-series data used to contextualize environmental/exposure conditions.
- **PIPELINE_TEST:** used to test ingestion, parsing, units, provenance, visualisation, or data-quality logic.
- **NOT_APPROVED:** access, licensing, or scientific suitability has not been resolved; do not package or depend on it in the submission yet.

A dataset can have more than one role, but each role must be justified. Keep actual observations, derived features, model predictions, and synthetic demo data separate.

### 1.3 Provenance rules

Every imported record must retain, where available:

- `provider` and `dataset_id` / accession / DOI;
- source landing page and direct file/API endpoint;
- dataset version and file name;
- source subject/sample/participant identifier (pseudonymous as provided);
- measurement/analyte and original variable name;
- original value and unit, plus canonical value/unit if converted;
- original timepoint/timestamp and time-zone semantics;
- assay, instrument, device, specimen, protocol, and cohort metadata;
- license/terms identifier and access date;
- processing script/version and any filtering or derivation applied;
- role in this project and whether a displayed value is observed, derived, or synthetic.

Do not relabel an Earth-based cohort as an astronaut cohort. Do not relabel an animal, cell-culture, ex-vivo, or analog experiment as direct human spaceflight evidence. Do not present synthetic data as NASA data.

### 1.4 Licensing and submission gate

Before bundling or redistributing any third-party file, check the dataset's current landing-page licence, original authors' terms, and NASA Space Apps Challenge legal terms. The challenge legal page places responsibility on teams to have rights to use and publish third-party materials and to cite all sources. A repository's metadata badge may not override a more restrictive notice on the original dataset-owner page.

Where two sources show conflicting terms, use the more restrictive interpretation until the owner clarifies. Keep a copy/link of the terms reviewed. For data that requires an account, data-use agreement, credential, or controlled-access approval, do not redistribute it in the project repository.

---

## 2. Shortlist and prioritisation

### Recommended hackathon shortlist

| Priority | Dataset/resource | Provider | Primary module | Intended role | Why it is shortlisted |
|---|---|---|---|---|---|
| P0 | OSDR OSD-575 — Inspiration4 serum | NASA OSDR | Immune / metabolic / cardiovascular biomarkers | SCIENTIFIC_REFERENCE, PIPELINE_TEST | Real spaceflight samples; structured pre-flight and recovery timepoints; CC0 study licence shown by OSDR. |
| P0 | Environmental Data Application (EDA) | NASA OSDR | Environmental | ENVIRONMENTAL_FEED, PIPELINE_TEST | ISS cabin temperature, CO2, humidity and radiation-dose data; downloadable raw and summary tables. |
| P0 | RadLab API | NASA OSDR | Radiation | ENVIRONMENTAL_FEED, PIPELINE_TEST | Instrument-associated radiation time series with dose-rate and particle-flux fields. Select the instrument and mission carefully. |
| P0 | QoL_Stress v1.0.0 | PhysioNet | Behavioural / stress | MODEL_TRAINING, MODEL_VALIDATION | 66 adults; wearable heart rate, ECG, EDA and self-report measures; CC BY 4.0. |
| P1 | PPG-DaLiA | UCI | Cardiovascular signal quality / HR estimation | MODEL_TRAINING, MODEL_VALIDATION | PPG plus motion signals with ECG-derived heart-rate ground truth; CC BY 4.0. |
| P1 | PAMAP2 | UCI | Activity / exercise monitoring | MODEL_TRAINING, MODEL_VALIDATION, pending bundled notice review | IMUs and heart rate across labelled activities; useful for activity recognition, not spaceflight exercise equivalence. |
| P1 | Sleep-EDF Expanded | PhysioNet | Sleep | MODEL_TRAINING, MODEL_VALIDATION | 197 whole-night PSG recordings with expert sleep-stage annotations; ODbL 1.0. |
| P1 | OSDR OSD-140 / GLDS-140 — Mars500 | NASA OSDR | Isolation / longitudinal biology | SCIENTIFIC_REFERENCE | Six-person, 520-day ground simulation; 36 blood-cell DNA-methylation samples across six timepoints. |
| P1 | OSDR OSD-157 / GLDS-157 — ex-vivo radiation response | NASA OSDR | Radiation / immune response | SCIENTIFIC_REFERENCE; exploratory MODEL_TRAINING only | Human blood from five donors exposed ex vivo to graded gamma doses; not an astronaut in-flight exposure dataset. |
| P1 | OSDR OSD-410 — dose/time transcriptional response | NASA OSDR | Radiation / biological response | SCIENTIFIC_REFERENCE; exploratory MODEL_TRAINING only | 10 donors and 100 samples across defined doses and post-exposure times. |
| P1 | OSDR OSD-195 / GLDS-195 — 21-day bed rest | NASA OSDR | Musculoskeletal | SCIENTIFIC_REFERENCE | Human skeletal-muscle gene-expression study with 14 male subjects in normoxic bed rest. |
| P1 | 10,000 Immunomes Project (10KIP) | ImmPort / NIAID | Immune | SCIENTIFIC_REFERENCE; conditional analysis | Large curated healthy-human immunology reference; cross-study assay heterogeneity and data-use terms need care. |
| P2 | NHANES 2017–2018 Femur DXA (`DXXFEM_J`) | CDC/NCHS | Bone | SCIENTIFIC_REFERENCE | Direct BMD/BMC measures, but femur DXA eligibility was age 50+; poor match to typical astronaut population. |
| P2 | WESAD | University of Siegen / UCI catalogue | Behavioural / stress | NOT_APPROVED until licence clarified | Scientifically useful multimodal wearable dataset, but original owner page states scientific, non-commercial use while UCI metadata displays CC BY 4.0. |

**Do not treat P0/P1/P2 as medical importance rankings.** They are implementation priorities for this prototype.

---

## 3. Dataset records

## NASA datasets and NASA-hosted resources

### NASA-001 — OSDR OSD-575: SpaceX Inspiration4 Blood Serum Metabolic Panel and Immune/Cardiac Cytokine Arrays

- **Provider:** NASA Open Science Data Repository (OSDR) / Ames Life Sciences Data Archive (ALSDA).
- **Accession / DOI:** `OSD-575`; DOI `10.26030/mc5d-p710`.
- **Landing page:** https://osdr.nasa.gov/bio/repo/data/studies/OSD-575
- **Current OSDR study version checked:** Version 3 (metadata updated 11 June 2024; recheck at download because the record may change).
- **Download:** Use the OSDR study page's Files panel. Study metadata and transformed result files are downloadable there; check the individual file list and version.
- **License displayed by OSDR:** `CC0-1.0` (verify the current study page and any separate file-level terms at download time).
- **Study population / size:** Four Inspiration4 crew members; OSDR reports 28 serum samples (`n=28`).
- **Mission context:** Inspiration4 was a three-day low-Earth-orbit mission in September 2021.
- **Timepoints:** Pre-flight `L-92`, `L-44`, `L-3`; post-flight `R+1`; recovery `R+45`, `R+82`, and `R+194` (sample/assay availability differs by participant; inspect the versioned sample metadata before treating all participants as having all seven draws).
- **Available variables / assays:** Serum comprehensive metabolic panel; multiplex immune and cardiovascular cytokine/protein panels (including distinct assay platforms/panels). Preserve analyte name, platform, unit, sample and timepoint.
- **Intended module:** Immune / inflammation, metabolic and cardiovascular biomarker evidence.
- **Project role:** `SCIENTIFIC_REFERENCE`, `PIPELINE_TEST`. It may be shown as a NASA spaceflight evidence timeline. Do not train a generalized ML health predictor on 28 samples.
- **Preprocessing:** Download metadata and result files; inspect the assay-specific columns and units; reshape only after keeping `participant`, `sample`, `timepoint`, `assay/platform`, and analyte identifiers; retain missingness; never merge unlike assays solely because their analyte labels look similar; display pre-flight vs recovery timepoints explicitly.
- **Limitations:** Four people and a short mission; the described serum samples are pre-flight and post-flight recovery, not a continuous in-flight wearable stream. The dataset cannot establish long-duration Mars-mission trajectories or clinical decision thresholds.
- **Recommended demonstration:** Load selected real results into a “NASA research evidence” panel showing the actual timepoint and analyte. Keep this panel distinct from the synthetic live astronaut dashboard.
- **Citation:** Cite OSDR accession and DOI in the project references.

### NASA-002 — OSDR OSD-157 / GLDS-157: Gene Expression in Human Peripheral Blood 48 Hours After Ex-Vivo Ionizing Radiation

- **Provider:** NASA OSDR / GeneLab; source accession `E-GEOD-44201`.
- **Accession / DOI:** `OSD-157` / `GLDS-157`; DOI `10.26030/z1xz-xa10`.
- **Landing page:** https://osdr.nasa.gov/bio/repo/data/studies/OSD-157
- **NASA Open Data Portal:** https://data.nasa.gov/dataset/gene-expression-in-human-peripheral-blood-48-hours-after-exposure-to-ionizing-radiation
- **Download:** OSDR study Files panel; GEO accession is `GSE44201` (https://www.ncbi.nlm.nih.gov/geo/query/acc.cgi?acc=GSE44201).
- **License:** NASA Open Data Portal labels the resource `us-pd` / public-domain. Confirm file and source-record terms when downloading.
- **Study population / size:** Peripheral blood from five healthy donors; multiple ex-vivo dose and time conditions. Do not confuse the number of donors with the number of microarray samples.
- **Available variables:** Human peripheral-blood gene-expression microarray measurements; exposure dose (0, 0.5, 2, 5, 8 Gy gamma rays); time after treatment up to 48 hours; protocol, age/sex and sample metadata as supplied.
- **Intended module:** Radiation biological-response research and immune-related gene-expression exploration.
- **Project role:** `SCIENTIFIC_REFERENCE`; exploratory `MODEL_TRAINING` only for a clearly labelled laboratory dose-group task after checking sample structure and using donor-grouped evaluation.
- **Preprocessing:** Retrieve raw/processed array files and sample annotations; apply the published normalization/quality-control workflow; map probe IDs to gene identifiers using the platform annotation; handle batch and donor effects; ensure all samples from a donor are held in one split.
- **Limitations:** Ex-vivo gamma irradiation is not galactic cosmic radiation or a real astronaut exposure. Dose range and acute sampling conditions do not represent routine mission dose. Gene expression is not a direct personal dosimeter and must not be used to infer an astronaut's absorbed dose from wearable data.
- **Recommended demonstration:** A research-only chart of dose/time-associated expression patterns, not an astronaut risk prediction.

### NASA-003 — OSDR OSD-410: Dose- and Time-Dependent Transcriptional Response to Ionizing Radiation

- **Provider:** NASA OSDR / GeneLab.
- **Accession:** `OSD-410`.
- **Landing page:** https://osdr.nasa.gov/bio/repo/data/studies/OSD-410
- **Download:** OSDR study Files panel; also discoverable from the OSDR visualization portal.
- **License:** Check the current OSDR study page and each downloadable file's terms; do not infer a licence from the fact that the data is publicly visible.
- **Study population / size:** Blood from 10 human volunteers; 100 samples total in the described dataset.
- **Available variables:** Human blood transcriptional response / DNA microarray data; 0, 0.15, 0.30 and 1.50 Gy exposure conditions; 1, 2 and 6 hour post-exposure sampling (6-hour subset contains 20 samples); sample/donor metadata.
- **Intended module:** Radiation biological-response research.
- **Project role:** `SCIENTIFIC_REFERENCE`; exploratory `MODEL_TRAINING` only for small experimental dose/time classification, with donor-level grouping.
- **Preprocessing:** Inspect the study's exact sample map, platform and processed files; normalize array data; preserve donor, dose and time; avoid treating repeated conditions from one donor as independent subjects; use donor-held-out validation where sample size permits.
- **Limitations:** Small ex-vivo blood study. It does not model the particle spectrum, dose rate, shielding, tissue distribution, or chronic exposure profile of a spacecraft mission. It is not clinical proof of radiation injury.
- **Recommended demonstration:** Compare how the same exposure dose produces different transcriptional responses at different timepoints, as a scientific visualization.

### NASA-004 — OSDR OSD-140 / GLDS-140: Mars500 520-Day Mission Simulation

- **Provider:** NASA OSDR / GeneLab (ground-study data contributed by the Mars500 research team).
- **Accession / DOI:** `OSD-140` / `GLDS-140`; DOI `10.26030/pybz-6s43`; source accession `E-GEOD-64950`.
- **Landing page:** https://osdr.nasa.gov/bio/repo/data/studies/OSD-140/
- **Download:** OSDR study Files panel; GEO source record `E-GEOD-64950`.
- **License:** Verify the current OSDR file-level and source repository terms before redistribution.
- **Study population / size:** Six male crew members in a 520-day Mars mission simulation; 36 blood-cell DNA-methylation samples across six sampling points.
- **Available variables:** DNA methylation profiles generated with Illumina HumanMethylation450 BeadChip; sample/participant/timepoint metadata. The broader investigation is described as including mood-state and biochemical profiling, but do not assume those measures are present in the OSD-140 methylation files; inspect related study files and source records separately.
- **Intended module:** Isolation / confinement research and longitudinal adaptation context.
- **Project role:** `SCIENTIFIC_REFERENCE`; not a direct stress classifier training set unless separate, sufficiently labelled behavioural measurements are identified.
- **Preprocessing:** Parse sample annotations and timepoints; use standard methylation-array QC/normalization; keep participant IDs for within-person longitudinal analyses; account for batch and repeated measures.
- **Limitations:** Six participants; ground simulation, not actual spaceflight; OSD-140's downloadable assay is DNA methylation, not continuous mood or wearable telemetry.
- **Recommended demonstration:** Show a mission-phase timeline and use it to justify longitudinal monitoring during confinement. Do not claim that methylation measurements are a real-time mental-health sensor.

### NASA-005 — OSDR OSD-195 / GLDS-195: Effects of 21 Days of Bed Rest on Human Skeletal Muscle Gene Expression

- **Provider:** NASA OSDR / GeneLab; PlanHab-related ground study.
- **Accession / DOI:** `OSD-195` / `GLDS-195`; DOI `10.26030/r6bv-rk07`; source accession `GSE104999`.
- **Landing page:** https://osdr.nasa.gov/bio/repo/data/studies/OSD-195
- **NASA Open Data Portal:** https://data.nasa.gov/dataset/effects-of-21-days-of-bedrest-on-human-skeletal-muscle-gene-expression
- **Download:** OSDR Files panel / GEO source accession.
- **License:** NASA Open Data Portal currently marks the record public (`us-pd`); verify the individual file and upstream terms at use time.
- **Study population / size:** 14 male subjects participated in the normoxic bed-rest arm described by the study page. The study also discusses separate hypoxic bed-rest and hypoxic ambulation conditions in the broader PlanHab protocol; inspect sample metadata before selecting only the relevant arm.
- **Available variables:** Skeletal muscle (vastus lateralis) gene-expression measurements and sample metadata; 21 days of sustained recumbence / unloading in the normoxic bed-rest sub-study.
- **Intended module:** Musculoskeletal / muscle deconditioning scientific context.
- **Project role:** `SCIENTIFIC_REFERENCE`; exploratory molecular analysis only.
- **Preprocessing:** Inspect study design and arm labels; separate normoxic bed rest, hypoxic bed rest and hypoxic ambulation where present; normalize expression data; retain participant and sampling timepoint; avoid mixing different intervention arms without explicit modelling.
- **Limitations:** Bed rest is an analog, not microgravity; skeletal muscle gene expression is not the same as direct bone mineral density or muscle-strength measurement; the cohort is small and male-only in the described arm.
- **Recommended demonstration:** Use as evidence for the need to monitor muscle adaptation and exercise countermeasures, not as a deployed strength prediction model.

### NASA-006 — Environmental Data Application (EDA): ISS Cabin and Hardware Environmental Telemetry

- **Provider:** NASA OSDR.
- **Resource ID:** No single OSDR study accession; EDA is a portal/API exposing mission and hardware-associated data.
- **Landing page:** https://visualization.osdr.nasa.gov/eda/
- **Download:** EDA Mission Dashboard / Mission Comparison / Data Tables tabs; raw and summary tables are offered for download.
- **License:** Check the metadata and usage terms associated with the selected mission, instrument and downloadable table. Do not assume one blanket licence applies to every underlying dataset.
- **Available variables:** Depending on mission/hardware coverage, temperature, carbon dioxide (CO2), relative humidity and radiation-dose measurements; mission and ground-control comparisons.
- **Intended module:** Environmental monitoring and symptom-context timeline.
- **Project role:** `ENVIRONMENTAL_FEED`, `PIPELINE_TEST` and `SCIENTIFIC_REFERENCE`.
- **Preprocessing:** Select a mission and hardware source; inspect units, timestamps, sampling cadence, gaps and sensor identifiers; convert timestamps consistently; keep source instrument and location; resample only for visualization/analysis and retain original cadence.
- **Limitations:** Environmental telemetry is not itself an astronaut clinical record. It may not be synchronized to a specific person's symptoms or health observations. Do not infer causality from temporal coincidence.
- **Recommended demonstration:** Plot a real ISS cabin CO2/temperature/humidity series beside a separately labelled simulated astronaut symptom timeline.

### NASA-007 — RadLab API: Spaceflight Radiation Measurements

- **Provider:** NASA OSDR / RadLab.
- **Resource ID:** RadLab data API; individual instruments and datasets have their own identifiers.
- **Landing page:** https://visualization.osdr.nasa.gov/radlab/
- **API documentation:** https://visualization.osdr.nasa.gov/radlab/gui/data-api/
- **API endpoint:** `https://visualization.osdr.nasa.gov/radlab/api`
- **Download:** Programmatic GET queries; the RadLab interface also supports exports.
- **License:** Review the selected instrument/dataset metadata and any instrument-specific terms. Record the exact instrument ID and mission source.
- **Available variables (depending on instrument):** Timestamp, instrument ID, absorbed dose rate (`µGy/hour`), dose-equivalent rate (`µSv/hour`), particle flux (`cm^-2 sr^-1 s^-1`), and, where available, spacecraft latitude, longitude, altitude, magnetic field `B`, and McIlwain `L`.
- **Intended module:** Radiation exposure context and monitoring.
- **Project role:** `ENVIRONMENTAL_FEED`, `PIPELINE_TEST`, `SCIENTIFIC_REFERENCE`.
- **Preprocessing:** Select a compatible instrument/time period; inspect whether fields are rates, increments, or cumulative values; preserve instrument-specific semantics; check gaps and unit conventions; never add absorbed dose to dose equivalent; do not double-count cumulative totals.
- **Limitations:** Different instruments and locations produce non-identical radiation measurements. ISS/LEO data are not a direct surrogate for deep-space Mars radiation. A sensor's dose rate is not automatically an astronaut-specific organ dose.
- **Recommended demonstration:** Show instrument-identified radiation time series and a clear unit-labelled exposure history; describe it as contextual measurement, not personal clinical dose unless the dosimeter is actually assigned to that astronaut.

---

## Third-party human datasets

### EXT-001 — QoL_Stress: A Multimodal Dataset of Physiological and Self-Reported Stress Responses

- **Provider:** PhysioNet; authors Amaia Calvo, Ander Cejudo, Cristina Martín Andonegui.
- **Version / DOI:** v1.0.0, published 7 October 2026; DOI `10.13026/vqtz-pm70`.
- **Landing/download:** https://physionet.org/content/qol-stress/1.0.0/ ; direct files https://physionet.org/files/qol-stress/1.0.0/ ; PhysioNet package download is also available.
- **License:** Creative Commons Attribution 4.0 International (`CC BY 4.0`). Cite the versioned PhysioNet record.
- **Study population / size:** 66 healthy adults. Files include 66 participant records and HR files; 124 EDA recordings are listed, with eight expected EDA recordings absent due to acquisition errors. Total uncompressed dataset size reported by PhysioNet: 10.6 MB (2.1 MB ZIP).
- **Available variables:** ECG at 250 Hz; EDA recordings (up to two minutes in the described protocol); Fitbit Charge 6 HR at per-second and per-minute resolution; daily HR summaries; participant demographics; PSS-14 perceived stress questionnaire; STAI-S state anxiety questionnaire; relaxed (`RELAX`) and experimentally induced stress (`STRESS`) phases based on cognitive/interactive tasks.
- **Intended module:** Behavioural / stress-support research; physiological signal feature pipeline.
- **Project role:** `MODEL_TRAINING`, `MODEL_VALIDATION`, `PIPELINE_TEST`.
- **Possible target:** Experimental phase classification (`RELAX` vs `STRESS`) or exploratory association between physiological features and self-report scores. Treat this as acute experimental stress recognition, not diagnosis or chronic-stress prediction.
- **Preprocessing:** Inspect README/data dictionary first; parse timestamps and participant/session identifiers; align ECG/EDA/HR carefully; compute ECG-derived HRV only after signal-quality checks; use EDA validity flags; handle the eight missing EDA recordings; avoid data leakage by splitting by participant (GroupKFold / leave-subject-out); report class balance and participant count.
- **Limitations:** Controlled short protocol; healthy adults; acute laboratory stress, not months of isolation, sleep disruption, operational workload, or a spaceflight cohort. The EDA segment is short, not a continuous months-long stream. A model may learn task/protocol artefacts rather than a general stress construct.
- **Recommended demonstration:** Train a small baseline model on participant-held-out features, compare to a simple baseline, and clearly label output as “experimental stress-state estimate” rather than an astronaut mental-health assessment.

### EXT-002 — PPG-DaLiA: PPG-Based Heart-Rate Estimation in Daily Life

- **Provider:** UCI Machine Learning Repository; Reiss, Indlekofer and Schmidt.
- **DOI:** `10.24432/C53890`.
- **Landing/download:** https://archive.ics.uci.edu/dataset/495/ppg-dalia (download is approximately 2.7 GB).
- **License displayed by UCI:** Creative Commons Attribution 4.0 International (`CC BY 4.0`).
- **Study population / size:** 15 participants; approximately 8.3 million instances.
- **Available variables:** Wrist PPG and 3-axis accelerometer data plus chest-worn physiological reference data including ECG-derived heart-rate ground truth; multimodal time series collected during daily-life activities.
- **Intended module:** Wearable cardiovascular data quality and heart-rate estimation under motion.
- **Project role:** `MODEL_TRAINING`, `MODEL_VALIDATION`, `PIPELINE_TEST`.
- **Possible target:** Regression of ECG-reference heart rate from PPG and motion features; quality/motion-artifact analysis.
- **Preprocessing:** Follow the original README and sampling-rate metadata; synchronize sensor channels; segment windows; handle motion artefacts; use subject-grouped splits; evaluate MAE/RMSE and error by activity/motion level.
- **Limitations:** Only 15 participants; daily-life Earth activity, not microgravity; PPG-derived HR is not ECG; does not provide clinical cardiovascular-event labels or astronaut baselines. The archive is large relative to the hackathon timeline.
- **Recommended demonstration:** Use a small reproducible subset to validate a wearable HR pipeline; retain the model's quality/uncertainty output rather than returning an unqualified number.

### EXT-003 — PAMAP2 Physical Activity Monitoring

- **Provider:** UCI Machine Learning Repository; Reiss and Stricker.
- **Dataset ID / DOI:** UCI dataset `231`; DOI `10.24432/C5NW2H`.
- **Landing/download:** https://archive.ics.uci.edu/dataset/231/pamap2+physical+activity+monitoring (archive approximately 656 MB).
- **License displayed by UCI:** Creative Commons Attribution 4.0 International (`CC BY 4.0`). The bundled README requests scientific citation; inspect the bundled usage notice when downloading.
- **Study population / size:** Nine subjects; 18 labelled physical activities; 3,850,505 instances; 54 columns (timestamp, activity label, heart rate and sensor attributes).
- **Available variables:** Three Colibri IMUs on wrist, chest and ankle (100 Hz); heart-rate monitor (approximately 9 Hz); activity labels; timestamp; sensor streams. Missing values occur.
- **Intended module:** Activity recognition and exercise-session monitoring.
- **Project role:** `MODEL_TRAINING`, `MODEL_VALIDATION`, `PIPELINE_TEST`, after licence/README review.
- **Possible target:** Activity classification or exercise-session segmentation; not estimation of astronaut fitness or training adequacy without a separate validated method.
- **Preprocessing:** Read original README; parse subject files; align different sampling frequencies; handle missing values; explicitly decide how to treat transient/other activity label 0; group splits by subject; compute activity duration only after correct segmentation.
- **Limitations:** Nine subjects, scripted Earth activities, not a spacecraft exercise protocol or microgravity. Some classes/optional activities are unevenly represented.
- **Recommended demonstration:** A small activity classifier that tags a simulated exercise session. Clearly state that it recognizes activity patterns, not the physiological effectiveness of the exercise.

### EXT-004 — Sleep-EDF Expanded

- **Provider:** PhysioNet; original database associated with Bob Kemp and collaborators.
- **Version / DOI:** v1.0.0; DOI `10.13026/C2X676`.
- **Landing/download:** https://physionet.org/content/sleep-edfx/1.0.0/ (large collection; download selected recordings rather than the full set for a hackathon).
- **License:** Open Data Commons Attribution License v1.0 (`ODC-By 1.0`).
- **Study population / size:** 197 whole-night polysomnographic recordings from two studies; healthy subjects and subjects with mild difficulty falling asleep are represented in the collection.
- **Available variables:** EEG (Fpz-Cz and Pz-Oz channels in the described recordings), horizontal EOG, chin EMG, event markers; some records also contain respiration and body temperature; expert-scored hypnograms / sleep-stage annotations.
- **Intended module:** Sleep-stage analysis research, only if suitable PSG/EEG hardware is in scope.
- **Project role:** `MODEL_TRAINING`, `MODEL_VALIDATION`, `PIPELINE_TEST`.
- **Possible target:** Sleep-stage classification using EEG/EOG/EMG.
- **Preprocessing:** Read recording-specific channel metadata; use EDF-compatible tooling; handle missing/variable channels; map annotations carefully; split by participant/recording; do not allow windows from one night/subject across train and test.
- **Limitations:** PSG signals are not available from a typical wrist wearable; old studies and scoring conventions; not astronaut sleep data; sleep-stage predictions are not the same as sleep duration or sleep quality.
- **Recommended demonstration:** Optional research notebook only. For the MVP, manual sleep duration/quality and a brief vigilance task are likely more practical.

### EXT-005 — 10,000 Immunomes Project (10KIP)

- **Provider:** ImmPort / NIAID; Zalocusky et al., Cell Reports (2018).
- **Landing/download:** https://www.immport.org/resources/aireadydatasets ; source paper https://doi.org/10.1016/j.celrep.2018.09.021.
- **Access / terms:** ImmPort provides an AI-ready dataset download (listed as 138.2 MB) and may present a user agreement / data-use agreement. Accept and comply with the current terms; do not mirror the package into a public repo unless redistribution rights are explicit.
- **Study population / size:** Initial curated resource: 10,344 healthy control subjects from 83 studies, derived from ImmPort Data Release 21 (historical release). It should not be represented as a newly recruited single cohort.
- **Available variables:** Multiple immunology assay types, including flow cytometry, CyTOF, mRNA expression, secreted proteins/cytokines, clinical laboratory tests, HAI titres, HLA types and other measurements. Not every participant has every assay.
- **Intended module:** Immune biomarker reference and exploratory analysis.
- **Project role:** `SCIENTIFIC_REFERENCE`; conditional analysis after agreement/assay harmonization.
- **Preprocessing:** Inspect the AI-ready data dictionary and per-study metadata; preserve study ID, assay type, units, batch, specimen, participant and visit; use only harmonized fields where the published processing supports comparison; account for study/batch effects and sparse measurements.
- **Limitations:** Many studies, assays and protocols; non-uniform measurements and sparse overlap; healthy Earth-based controls are not astronaut-specific reference intervals; historical resource snapshot. It is not safe to concatenate all columns and train one classifier.
- **Recommended demonstration:** A carefully scoped reference plot for one compatible assay/analyte with study and assay provenance visible.

### EXT-006 — NHANES 2017–2018 Femur DXA (`DXXFEM_J`)

- **Provider:** U.S. Centers for Disease Control and Prevention (CDC), National Center for Health Statistics (NCHS).
- **Landing/data documentation:** https://wwwn.cdc.gov/Nchs/Data/Nhanes/Public/2017/DataFiles/DXXFEM_J.htm
- **Download:** `DXXFEM_J.xpt` linked from the NHANES 2017–2018 examination data page.
- **Access / terms:** Public-use federal survey data; review the NCHS data-user agreement, analytic guidance, and survey design requirements. Do not assume a Creative Commons licence where none is stated.
- **Study population / size:** NHANES 2017–2018 nationally representative survey sample; femur DXA eligibility was restricted to participants aged 50 years and older, with exclusions documented by NCHS. Use the actual file frequencies after download for the eligible record count.
- **Available variables:** Femur bone mineral content (BMC), bone area and bone mineral density (BMD), including total femur, femoral neck, trochanter, intertrochanter and Ward's triangle; respondent sequence ID for joining relevant NHANES files.
- **Intended module:** Bone-health measurement education / population-reference visualisation.
- **Project role:** `SCIENTIFIC_REFERENCE` only for this prototype.
- **Preprocessing:** Read the NCHS codebook; handle scan status and invalidity codes; apply NHANES weights and complex-survey design for population estimates; join files on `SEQN` only after checking duplicate/eligibility rules.
- **Limitations:** Age 50+ eligibility makes this a poor demographic match to many astronauts; cross-sectional rather than repeated within-person measurements; not a microgravity/bone-loss progression cohort. Do not use it to train an astronaut bone-loss predictor.
- **Recommended demonstration:** Use only to explain what DXA/BMD variables look like, not to infer astronaut change over a mission.

### EXT-007 — WESAD: Wearable Stress and Affect Detection — LICENCE HOLD

- **Provider:** University of Siegen; UCI catalogue mirror/metadata.
- **DOI:** `10.24432/C57K5T`.
- **Landing/download:** Original dataset page https://ubi29.informatik.uni-siegen.de/usi/data_wesad.html ; UCI catalogue https://archive.ics.uci.edu/dataset/465/wesad+wearable+stress+and+affect+detection.
- **License / terms conflict:** The original authors' page states that the data may be used for scientific, non-commercial purposes with attribution. UCI's catalogue currently displays `CC BY 4.0`. These statements are not identical. **Do not include WESAD data files or model artifacts derived from it in the public submission/repository until the original owners' terms are clarified in writing.** For private academic exploration, follow at least the original non-commercial restriction and cite the owners.
- **Study population / size:** 15 participants in a laboratory stress/affect study; UCI reports approximately 63 million instances.
- **Available variables:** Chest- and wrist-worn data including blood-volume pulse, ECG, EDA, EMG, respiration, body temperature and three-axis acceleration; neutral, stress and amusement states; self-report questionnaires.
- **Intended module:** Behavioural / stress research.
- **Project role:** `NOT_APPROVED` for submission until license is reconciled. Scientifically, it could be an optional model-training/benchmark dataset if use terms are cleared.
- **Preprocessing:** If approved, parse participant-specific files and labels; synchronize chest/wrist signals; segment by protocol phases; split by participant; avoid random overlapping-window leakage.
- **Limitations:** Very small cohort; acute laboratory protocol; not chronic isolation or astronaut psychological health; original page's non-commercial notice conflicts with current UCI metadata badge.
- **Decision:** Keep in the registry for research awareness, but exclude from the MVP build and public repository for now.

---

## 4. Dataset access and processing notes

### 4.1 NASA OSDR programmatic access

NASA documents REST endpoints for study search, metadata retrieval, and data-file metadata/download locations. API documentation: https://api.nasa.gov/ (section: Open Science Data Repository Public API).

Example patterns documented by NASA include:

```text
Study metadata:
https://osdr.nasa.gov/osdr/data/osd/meta/{OSD_STUDY_ID}

Study files:
https://osdr.nasa.gov/osdr/data/osd/files/{OSD_STUDY_ID}/?page=0&size=25

Search:
https://osdr.nasa.gov/osdr/data/search?term={keyword}
```

Use the OSDR landing page and study metadata as the source of truth for current accession version, file names, sample structure, and file access. API output should be cached with retrieval timestamp and source URL.

### 4.2 Sampling-frequency and cohort alignment

Do not combine raw time series from different datasets into one model table without a scientifically meaningful shared target. For example:

- PPG-DaLiA's raw PPG/accelerometer windows are suitable for a wearable heart-rate estimation task.
- QoL_Stress ECG/EDA/HR records are suitable for an acute stress protocol task.
- OSD-575 serum analytes are sparse pre-flight/recovery laboratory samples.
- RadLab and EDA are spacecraft/instrument environmental time series.

These have different populations, time scales, units, labels, and meanings. Their outputs can feed different software modules and then be combined at the **assessment** layer, with provenance intact; the raw rows should not be naively concatenated.

### 4.3 Train/validation/test splitting

For human sensor datasets (QoL_Stress, PPG-DaLiA, PAMAP2, Sleep-EDF, and WESAD if cleared):

- Split by participant, not by random rows/windows.
- Keep all records from one subject in only one split.
- If multiple sessions/nights exist, keep related sessions together unless the evaluation plan explicitly tests within-person personalization.
- Fit scalers, imputation, feature selection and normalization on training data only.
- Report participant count and subject-level metrics, not only window-level accuracy.
- Where possible, perform external-dataset evaluation; expect domain shift.

For small NASA studies (OSD-575, OSD-157, OSD-410, OSD-140, OSD-195):

- Prefer scientific visualisation, descriptive statistics and hypothesis-generating analysis.
- If testing an ML idea, make it explicitly exploratory, use donor/subject-grouped splits, and disclose low statistical power.
- Do not claim clinically validated prediction or generalization to a future astronaut population.

### 4.4 Cross-dataset use

A model trained on Earth-based data must not be described as validated for astronauts. A safe wording for the demo is:

> “This component was developed and evaluated on a public Earth-based research dataset for the specified signal-processing task. NASA spaceflight datasets are used separately to provide spaceflight-specific scientific context and to demonstrate NASA-data ingestion. The model has not been clinically validated for astronauts.”

### 4.5 Data integrity

For every downloaded source:

1. Save the original archive/file unchanged in a raw-data location (do not commit large data files unless required and license permits).
2. Save its checksum (SHA-256) and source URL.
3. Record download date and version.
4. Keep extraction and preprocessing scripts under version control.
5. Write cleaned/derived data to a separate folder.
6. Maintain a data card with variable mapping, missingness, exclusions, transformations, and known limitations.
7. Ensure synthetic data and actual research observations cannot be confused in the UI, exports, or screenshots.

Suggested local directory structure:

```text
project/
  docs/
    specification/
    research/
      dataset-registry.md
      dataset-cards/
  data/
    raw/          # gitignored; original downloaded files
    interim/      # gitignored; extracted/intermediate files
    processed/    # gitignored; cleaned/derived files
    sample/       # small, redistributable samples only after licence review
  notebooks/
  src/
  tests/
```

---

## 5. Dataset use in the MVP

Dataset selection and work sequencing are controlled by the v0.3 architecture and MVP cutline in the main [specification](../../README.md). This registry is not a second implementation plan. No data import is required for the offline-to-ground MVP vertical slice. If an optional NASA or third-party dataset is selected, complete the access, licence, version, provenance, and scientific-fit checks in this registry before packaging or displaying it.

---

## 6. Source and citation index

### NASA / spaceflight data (additional NASA resources; challenge-list membership unverified)

1. NASA OSDR OSD-575 — https://osdr.nasa.gov/bio/repo/data/studies/OSD-575
2. NASA OSDR OSD-157 / GLDS-157 — https://osdr.nasa.gov/bio/repo/data/studies/OSD-157
3. NASA Open Data Portal GLDS-157 record — https://data.nasa.gov/dataset/gene-expression-in-human-peripheral-blood-48-hours-after-exposure-to-ionizing-radiation
4. NASA OSDR OSD-410 — https://osdr.nasa.gov/bio/repo/data/studies/OSD-410
5. NASA OSDR OSD-140 / GLDS-140 — https://osdr.nasa.gov/bio/repo/data/studies/OSD-140/
6. NASA OSDR OSD-195 / GLDS-195 — https://osdr.nasa.gov/bio/repo/data/studies/OSD-195
7. NASA Environmental Data Application — https://visualization.osdr.nasa.gov/eda/
8. NASA RadLab — https://visualization.osdr.nasa.gov/radlab/
9. NASA RadLab API documentation — https://visualization.osdr.nasa.gov/radlab/gui/data-api/
10. NASA OSDR API documentation — https://api.nasa.gov/
11. NASA OSDR overview — https://science.nasa.gov/biological-physical/data/osdr/
12. NASA Space Apps 2026 challenge — https://www.spaceappschallenge.org/2026/challenges/health-monitoring-software/
13. NASA Space Apps legal terms — https://www.spaceappschallenge.org/legal/

### Third-party data

14. QoL_Stress, PhysioNet — https://physionet.org/content/qol-stress/1.0.0/
15. PPG-DaLiA, UCI — https://archive.ics.uci.edu/dataset/495/ppg-dalia
16. PAMAP2, UCI — https://archive.ics.uci.edu/dataset/231/pamap2+physical+activity+monitoring
17. Sleep-EDF Expanded, PhysioNet — https://physionet.org/content/sleep-edfx/1.0.0/
18. 10K Immunomes, ImmPort — https://www.immport.org/resources/aireadydatasets
19. 10K Immunomes paper — https://doi.org/10.1016/j.celrep.2018.09.021
20. NHANES Femur DXA 2017–2018 — https://wwwn.cdc.gov/Nchs/Data/Nhanes/Public/2017/DataFiles/DXXFEM_J.htm
21. WESAD original owner page — https://ubi29.informatik.uni-siegen.de/usi/data_wesad.html
22. WESAD UCI catalogue — https://archive.ics.uci.edu/dataset/465/wesad+wearable+stress+and+affect+detection

---

## 7. Decisions to record before using a dataset in the build

For every source moved from `candidate` to `approved`, fill in this checklist in a dataset card:

- [ ] The dataset was downloaded from the authoritative source.
- [ ] The exact version/accession and download date are recorded.
- [ ] The original licence and any additional terms have been reviewed.
- [ ] The team can legally use, modify, and include the required material in the NASA Space Apps submission.
- [ ] Required citation and attribution text are stored.
- [ ] The available variables and units have been inspected from the actual files, not inferred from a paper abstract.
- [ ] Sample counts and participant counts have been confirmed from the downloaded manifest.
- [ ] Inclusion/exclusion rules and missingness are documented.
- [ ] A preprocessing plan and a subject-safe evaluation split are defined.
- [ ] The intended output is appropriate to the dataset's population and experimental setting.
- [ ] UI labels distinguish NASA/third-party observed data, derived values, and synthetic demo data.
- [ ] A limitation statement is ready for the project demo and submission.

**Approval rule:** A dataset is not `approved_for_model_training` merely because it is publicly downloadable. Scientific fit, data rights, variable semantics, and a leakage-resistant evaluation plan must all be checked first.

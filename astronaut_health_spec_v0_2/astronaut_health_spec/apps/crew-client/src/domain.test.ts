import { describe, expect, it } from "vitest";
import { analyse, analysisForRecords, apiCode, astronautId, clientId, isSyncable, missionId, sourceType, validateMeasurement, type Observation } from "./domain";

const observation: Observation = { id: "observation-1", value: 72, measuredAt: "2026-11-15T00:00:00Z", createdAt: "2026-11-15T00:00:00Z", syncStatus: "queued" };

describe("local baseline analysis", () => {
  it("records the exact configured-baseline comparison without clinical classification", () => {
    const result = analyse(observation, { id: "baseline-1", value: 60, version: 1, method: "demo" });
    expect(result.delta).toBe(12);
    expect(result.summary).toContain("configured 60 bpm baseline");
    expect(result.summary).toContain("No clinical threshold");
  });

  it("returns an explicit insufficient-data assessment when no baseline exists", () => {
    const result = analyse(observation, null);
    expect(result.status).toBe("insufficient_data");
    expect(result.delta).toBeNull();
  });

  it("rejects the demonstrated implausible sleep and temperature entries without using clinical thresholds", () => {
    expect(validateMeasurement("sleep_duration", "60", "sleep_cognition")).toContain("supported input range");
    expect(validateMeasurement("body_temperature", "24", "immune")).toContain("supported input range");
    expect(validateMeasurement("spo2", "101", "cardiovascular")).toContain("supported input range");
    expect(validateMeasurement("sleep_duration", "8", "sleep_cognition")).toBeNull();
  });

  it("marks empty and stale records as insufficient data", () => {
    expect(analysisForRecords([]).status).toBe("insufficient_data");
    expect(analysisForRecords([{ id: "old", code: "sleep_duration", value: "8", measuredAt: "2020-01-01T00:00:00Z" }]).status).toBe("insufficient_data");
  });
});

describe("backend catalogue compatibility", () => {
  it("uses the identifiers published by the seeded backend", () => {
    expect(missionId).toBe("11111111-1111-1111-1111-111111111111");
    expect(astronautId).toBe("22222222-2222-2222-2222-222222222222");
    expect(clientId).toBe("33333333-3333-3333-3333-333333333333");
  });

  it("translates only verified code aliases", () => {
    expect(apiCode("pain")).toBe("pain_score");
    expect(apiCode("heart_rate")).toBe("heart_rate");
  });

  it("keeps codes without a catalogue equivalent local-only", () => {
    expect(isSyncable("vision_changes", "0–10")).toBe(false);
    expect(isSyncable("laboratory_biomarker", "reported unit")).toBe(false);
    expect(isSyncable("nutrition_observations", "text")).toBe(false);
    expect(isSyncable("heart_rate", "bpm")).toBe(true);
    expect(isSyncable("pain", "0–10")).toBe(true);
  });

  it("uses the source types permitted by the catalogue", () => {
    expect(sourceType("personal_dose_rate")).toBe("dosimeter");
    expect(sourceType("environmental_radiation")).toBe("environmental_sensor");
    expect(sourceType("bone_density")).toBe("import");
    expect(sourceType("heart_rate")).toBe("manual");
  });
});

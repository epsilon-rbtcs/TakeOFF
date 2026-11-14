import { describe, expect, it } from "vitest";
import { analyse, analysisForRecords, validateMeasurement, type Observation } from "./domain";

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

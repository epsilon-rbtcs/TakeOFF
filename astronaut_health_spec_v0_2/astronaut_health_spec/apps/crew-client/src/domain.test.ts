import { describe, expect, it } from "vitest";
import { analyse, type Observation } from "./domain";

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
});

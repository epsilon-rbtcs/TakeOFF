export const astronautId = "11111111-1111-1111-1111-111111111111";
export const missionId = "22222222-2222-2222-2222-222222222222";
export const clientId = "33333333-3333-3333-3333-333333333333";
export type Baseline = { id:string; value:number; version:number; method:string };
export type Observation = { id:string; value:number; measuredAt:string; createdAt:string; syncStatus:string; };
export type Assessment = { id:string; observationId:string; assessedAt:string; summary:string; delta:number|null; status:"normal"|"insufficient_data"; syncStatus:string; };
export function analyse(o: Observation, baseline: Baseline | null): Assessment {
  if (!baseline) return { id: crypto.randomUUID(), observationId:o.id, assessedAt:new Date().toISOString(), delta:null, status:"insufficient_data", syncStatus:"queued", summary:"Insufficient data: no configured personal heart-rate baseline is available. No clinical conclusion was generated." };
  const delta = o.value - baseline.value;
  return { id: crypto.randomUUID(), observationId:o.id, assessedAt:new Date().toISOString(), delta,
    status:"normal", syncStatus:"queued", summary:`Demo baseline comparison: ${o.value} bpm versus this crew member's configured ${baseline.value} bpm baseline (${delta >= 0 ? "+" : ""}${delta} bpm). No clinical threshold, diagnosis, or medical clearance is applied.` };
}
function canonical(value: unknown): unknown { if (Array.isArray(value)) return value.map(canonical); if (value && typeof value === "object") return Object.fromEntries(Object.entries(value as Record<string, unknown>).sort(([a],[b]) => a.localeCompare(b)).map(([k,v]) => [k, canonical(v)])); return value; }
export function stableHash(value: unknown) { const text = JSON.stringify(canonical(value)); return crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)).then(b => [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,"0")).join("")); }

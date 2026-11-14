import { useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

const astronautId = "11111111-1111-1111-1111-111111111111";
const missionId = "22222222-2222-2222-2222-222222222222";
const API = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000/api/v1";
type Summary = { freshness: string; latest_measured_at: string | null; latest_received_at: string | null; communication: { state: string; observed_at: string; last_successful_contact_at: string | null; queued_event_count: number } | null; observations: Array<{ observation_id: string; measurement_code: string; value: number; unit: string; measured_at: string; created_at: string; received_at: string }>; assessments: Array<{ assessment_id: string; summary: string; assessed_at: string }> };

function App() {
  const [data, setData] = useState<Summary | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  async function load() {
    setLoading(true); setError("");
    try {
      const auth = await fetch(`${API}/auth/demo-token`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: "medical", password: "ground-demo" }) });
      if (!auth.ok) throw new Error(`Authentication returned HTTP ${auth.status}.`);
      const token = (await auth.json()).access_token;
      const response = await fetch(`${API}/dashboard/summary?astronaut_id=${astronautId}&mission_id=${missionId}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) throw new Error(`Dashboard returned HTTP ${response.status}.`);
      setData(await response.json());
    } catch (reason) { setError(`Ground API is unavailable. ${reason instanceof Error ? reason.message : String(reason)}`); }
    finally { setLoading(false); }
  }
  return <main><header><div><h1>Ground Health Console</h1><p>Authorized demo medical view · synthetic data only</p></div><button onClick={load} disabled={loading}>{loading ? "Refreshing…" : "Refresh synchronized crew record"}</button></header><p className="disclaimer">No diagnosis or medical clearance is provided by this demonstration.</p>{error && <p role="alert">{error}</p>}{data && <><section className="summary"><article><b>Data freshness</b><p>{data.freshness}</p></article><article><b>Latest crew measurement</b><p>{data.latest_measured_at ?? "None"}</p></article><article><b>Ground receipt</b><p>{data.latest_received_at ?? "None"}</p></article></section><section><h2>Communication</h2><article>{data.communication ? <>State: <b>{data.communication.state}</b><br />Reported: {data.communication.observed_at}<br />Last successful contact: {data.communication.last_successful_contact_at ?? "Unknown"}<br />Queued events reported: {data.communication.queued_event_count}</> : "No communication status has reached ground."}</article></section><section><h2>Synchronized measurements</h2>{data.observations.length ? data.observations.map(item => <article key={item.observation_id}><b>{item.measurement_code.replaceAll("_", " ")}</b> · {item.value} {item.unit}<br /><small>Device/measurement: {item.measured_at}<br />Client created: {item.created_at}<br />Ground received: {item.received_at}</small></article>) : <p>No synchronized measurements.</p>}</section><section><h2>Explainable assessments</h2>{data.assessments.length ? data.assessments.map(item => <article key={item.assessment_id}>{item.summary}<br /><small>Assessed: {item.assessed_at}</small></article>) : <p>No synchronized assessments.</p>}</section></>}</main>;
}
createRoot(document.getElementById("root")!).render(<App />);

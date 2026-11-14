import Database from "@tauri-apps/plugin-sql";
import type { Assessment, Baseline, Observation } from "./domain";
let db: Database;
export type HealthRecord = { id:string; domain:string; code:string; value:string; unit:string; source:string; measuredAt:string; notes:string; checkinId:string|null; syncStatus:string };
export async function openStore() { db = await Database.load("sqlite:crew-health.db"); for (const statement of ["CREATE TABLE IF NOT EXISTS local_session (id INTEGER PRIMARY KEY CHECK(id=1), astronaut_id TEXT, display_name TEXT)","CREATE TABLE IF NOT EXISTS baselines (id TEXT PRIMARY KEY,value REAL,version INTEGER,method TEXT)","CREATE TABLE IF NOT EXISTS observations (id TEXT PRIMARY KEY,value REAL,measured_at TEXT,created_at TEXT,sync_status TEXT)","CREATE TABLE IF NOT EXISTS assessments (id TEXT PRIMARY KEY,observation_id TEXT,assessed_at TEXT,summary TEXT,delta REAL,status TEXT,sync_status TEXT)","CREATE TABLE IF NOT EXISTS outbox (event_id TEXT PRIMARY KEY,entity_type TEXT,payload TEXT,payload_hash TEXT,state TEXT)","CREATE TABLE IF NOT EXISTS communication (id INTEGER PRIMARY KEY CHECK(id=1),state TEXT)","INSERT OR IGNORE INTO communication VALUES(1,'BLACKOUT')","INSERT OR IGNORE INTO baselines VALUES('baseline-demo-hr-v1',60,1,'demo_personal_baseline_v1')"]) await db.execute(statement); const column = await db.select<{name:string}[]>("SELECT name FROM pragma_table_info('assessments') WHERE name='status'"); if (!column.length) await db.execute("ALTER TABLE assessments ADD COLUMN status TEXT NOT NULL DEFAULT 'normal'"); }
export async function establishDemoSession() { await db.execute("INSERT OR REPLACE INTO local_session VALUES(1,$1,$2)",["11111111-1111-1111-1111-111111111111","Demo Astronaut"]); }
export async function getBaseline(): Promise<Baseline|null> { return (await db.select<Baseline[]>("SELECT id,value,version,method FROM baselines LIMIT 1"))[0] ?? null; }
export async function save(o: Observation, a: Assessment, events: {id:string;type:string;payload:string;hash:string}[]) { await db.execute("INSERT INTO observations VALUES($1,$2,$3,$4,$5)",[o.id,o.value,o.measuredAt,o.createdAt,o.syncStatus]); await db.execute("INSERT INTO assessments VALUES($1,$2,$3,$4,$5,$6,$7)",[a.id,a.observationId,a.assessedAt,a.summary,a.delta,a.status,a.syncStatus]); for (const e of events) await db.execute("INSERT INTO outbox VALUES($1,$2,$3,$4,'queued')",[e.id,e.type,e.payload,e.hash]); }
export async function snapshot() { const observations=await db.select<Observation[]>("SELECT id,value,measured_at as measuredAt,created_at as createdAt,sync_status as syncStatus FROM observations ORDER BY created_at DESC"); const assessments=await db.select<Assessment[]>("SELECT id,observation_id as observationId,assessed_at as assessedAt,summary,delta,status,sync_status as syncStatus FROM assessments ORDER BY assessed_at DESC"); const state=(await db.select<{state:string}[]>("SELECT state FROM communication WHERE id=1"))[0].state; return {observations,assessments,state}; }
export async function setState(state:string) { await db.execute("UPDATE communication SET state=$1 WHERE id=1",[state]); }
export async function queued() { return db.select<{event_id:string;entity_type:string;payload:string;payload_hash:string}[]>("SELECT event_id,entity_type,payload,payload_hash FROM outbox WHERE state='queued'"); }
export async function accepted(ids:string[]) {
  for (const id of ids) {
    await db.execute("UPDATE outbox SET state='accepted' WHERE event_id=$1",[id]);
    await db.execute("UPDATE observations SET sync_status='synced' WHERE id=$1",[id]);
    await db.execute("UPDATE assessments SET sync_status='synced' WHERE id=$1",[id]);
    await db.execute("UPDATE health_records SET sync_status='synced' WHERE id=$1",[id]);
  }
}
export async function initialiseExtendedStore(){for(const sql of["CREATE TABLE IF NOT EXISTS health_records (id TEXT PRIMARY KEY,domain TEXT NOT NULL,code TEXT NOT NULL,value TEXT NOT NULL,unit TEXT NOT NULL,source TEXT NOT NULL,measured_at TEXT NOT NULL,notes TEXT NOT NULL DEFAULT '',checkin_id TEXT,sync_status TEXT NOT NULL)","CREATE TABLE IF NOT EXISTS checkins (id TEXT PRIMARY KEY,created_at TEXT NOT NULL,status TEXT NOT NULL)","CREATE TABLE IF NOT EXISTS actions (id TEXT PRIMARY KEY,finding TEXT NOT NULL,status TEXT NOT NULL,created_at TEXT NOT NULL)"])await db.execute(sql)}
export async function saveHealthRecords(records:HealthRecord[], complete:boolean, events:{id:string;type:string;payload:string;hash:string}[]){
  const checkinId=crypto.randomUUID();
  if(complete)await db.execute("INSERT INTO checkins VALUES($1,$2,'completed')",[checkinId,new Date().toISOString()]);
  for(const r of records) await db.execute("INSERT INTO health_records VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)",[r.id,r.domain,r.code,r.value,r.unit,r.source,r.measuredAt,r.notes,complete?checkinId:null,r.syncStatus]);
  for(const e of events) await db.execute("INSERT INTO outbox VALUES($1,$2,$3,$4,'queued')",[e.id,e.type,e.payload,e.hash]);
}
export async function healthHistory(){return db.select<HealthRecord[]>("SELECT id,domain,code,value,unit,source,measured_at as measuredAt,notes,checkin_id as checkinId,sync_status as syncStatus FROM health_records ORDER BY measured_at DESC")}

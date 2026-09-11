-- Fixes Disk IO 100% incident (2026-09-10): /display and /display-pharmacy
-- (waiting-room TV screens, left open 24/7) poll GET /public/queue and
-- GET /public/queue/pharmacy every 4 seconds. Those queries filter/join/order
-- on columns that had zero indexes anywhere in the schema (only `wilayah` and
-- `login_history` had any CREATE INDEX before this migration) — every poll
-- tick forced a seq scan on queue_calls plus a 3-table nested-loop join
-- across prescriptions/medical_records/appointments, hour after hour, which
-- is what saturated disk IO and produced the repeated
-- "canceling statement due to statement timeout" log entries.

-- GET /public/queue and /public/queue/pharmacy:
--   SELECT ... FROM queue_calls WHERE queue_type = $1 ORDER BY called_at DESC LIMIT 1
-- Append-only table (never cleaned up), polled every 4s from two screens —
-- the single most-hit unindexed query in the app.
CREATE INDEX IF NOT EXISTS idx_queue_calls_type_called_at
  ON queue_calls (queue_type, called_at DESC);

-- GET /public/queue/pharmacy: WHERE a.queue_number IS NOT NULL
CREATE INDEX IF NOT EXISTS idx_appointments_queue_number
  ON appointments (queue_number) WHERE queue_number IS NOT NULL;

-- GET /public/queue/pharmacy: JOIN appointments a ON a.id = mr.appointment_id
CREATE INDEX IF NOT EXISTS idx_medical_records_appointment_id
  ON medical_records (appointment_id);

-- GET /public/queue/pharmacy: JOIN medical_records mr ON mr.id = p.medical_record_id
CREATE INDEX IF NOT EXISTS idx_prescriptions_medical_record_id
  ON prescriptions (medical_record_id);

-- GET /public/queue/pharmacy:
--   WHERE p.status = 'paid' OR (p.status = 'completed' AND p.completed_at >= ...)
CREATE INDEX IF NOT EXISTS idx_prescriptions_status_completed_at
  ON prescriptions (status, completed_at);

-- GET /public/queue/pharmacy: ORDER BY p.created_at ASC
CREATE INDEX IF NOT EXISTS idx_prescriptions_created_at
  ON prescriptions (created_at);

-- Secondary contributor: PatientController.list live search uses
-- `full_name ILIKE '%...%' OR nik ILIKE '%...%' OR patient_number ILIKE '%...%'`.
-- A plain btree index can't serve a leading-wildcard ILIKE — needs pg_trgm's
-- trigram GIN index instead. patient_number already has an implicit unique
-- index (exact match), but the leading-wildcard search bypasses that too, so
-- it also gets a trigram index here.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_patients_full_name_trgm
  ON patients USING gin (full_name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_patients_nik_trgm
  ON patients USING gin (nik gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_patients_patient_number_trgm
  ON patients USING gin (patient_number gin_trgm_ops);

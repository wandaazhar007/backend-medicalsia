-- Links an invoice back to the visit (medical_records row) it was billed
-- for. Needed so patient detail can show "total biaya dibayar" per
-- kunjungan — previously invoices only traced back to a visit through the
-- nullable prescription_id, which is empty for consultation-only visits
-- (no medicine prescribed). See 04-architecture-conventions.md pattern for
-- optional-column follow-up migrations, e.g. 003_add_patient_email.sql.

ALTER TABLE invoices ADD COLUMN IF NOT EXISTS medical_record_id uuid REFERENCES medical_records(id);

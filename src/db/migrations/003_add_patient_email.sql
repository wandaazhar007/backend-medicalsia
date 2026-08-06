-- Fase 2 follow-up: adds patients.email (optional contact field, not in the
-- original 02-data-model.md schema — see that doc for the amendment note).

ALTER TABLE patients ADD COLUMN IF NOT EXISTS email text;

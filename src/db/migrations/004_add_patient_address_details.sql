-- Fase 2 follow-up: breaks patients.address into structured components
-- (village/district/city/province/postal_code) alongside the existing free-text
-- street line — see 02-data-model.md for the amendment note.

ALTER TABLE patients ADD COLUMN IF NOT EXISTS village text;      -- Kelurahan
ALTER TABLE patients ADD COLUMN IF NOT EXISTS district text;     -- Kecamatan
ALTER TABLE patients ADD COLUMN IF NOT EXISTS city text;         -- Kota
ALTER TABLE patients ADD COLUMN IF NOT EXISTS province text;     -- Provinsi
ALTER TABLE patients ADD COLUMN IF NOT EXISTS postal_code text;  -- Kode Pos

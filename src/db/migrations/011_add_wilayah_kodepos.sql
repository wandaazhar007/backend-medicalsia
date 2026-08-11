-- Postal code per kelurahan/desa (level 4 wilayah row) — lets the patient
-- form auto-fill Kode Pos once the user picks a village suggestion. Only
-- populated for level 4 rows; null for provinsi/kota/kecamatan. Data
-- sourced from github.com/cahyadsn/wilayah_kodepos (MIT licensed) — see
-- src/db/seed-wilayah.js.

ALTER TABLE wilayah ADD COLUMN IF NOT EXISTS kode_pos varchar(5);

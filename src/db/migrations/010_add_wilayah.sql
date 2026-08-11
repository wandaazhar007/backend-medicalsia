-- Indonesian administrative region reference table (provinsi / kota-kabupaten
-- / kecamatan / kelurahan-desa), used only to power autosuggest on the
-- patient form's address fields (village/district/city/province). Not
-- referenced by any FK — `patients` keeps storing plain free text for those
-- columns (04-architecture-conventions.md: no ORM, and addresses need to
-- stay editable even for entries not in this dataset).
--
-- `kode` follows the Kepmendagri wilayah code convention: dot-separated
-- segments encode the hierarchy (e.g. "11" = provinsi, "11.01" = kota/kab,
-- "11.01.01" = kecamatan, "11.01.01.2001" = kelurahan/desa). `level` and
-- `parent_kode` are precomputed at seed time so lookups don't need to parse
-- `kode` on every query. Data sourced from github.com/cahyadsn/wilayah
-- (MIT licensed) — see src/db/seed-wilayah.js.

CREATE TABLE IF NOT EXISTS wilayah (
    kode varchar(13) PRIMARY KEY,
    nama varchar(100) NOT NULL,
    level smallint NOT NULL,        -- 1=provinsi, 2=kota/kabupaten, 3=kecamatan, 4=kelurahan/desa
    parent_kode varchar(13)         -- null for level 1 (provinsi)
);

CREATE INDEX IF NOT EXISTS wilayah_parent_idx ON wilayah (parent_kode);
CREATE INDEX IF NOT EXISTS wilayah_level_nama_idx ON wilayah (level, nama);

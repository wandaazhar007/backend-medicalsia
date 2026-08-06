-- Fase 2: Registrasi Pasien & Rekam Medis

CREATE SEQUENCE IF NOT EXISTS patient_number_seq START 1;

CREATE TABLE IF NOT EXISTS patients (
  id              uuid primary key default gen_random_uuid(),
  patient_number  text unique not null default ('MD' || LPAD(nextval('patient_number_seq')::text, 5, '0')),
  full_name       text not null,
  nik             text,
  dob             date,
  phone           text,
  address         text,
  allergies       text,
  created_at      timestamptz default now()
);

-- appointment_id has no FK constraint yet because `appointments` doesn't exist
-- until the Fase 3 migration, which will add it via ALTER TABLE.
CREATE TABLE IF NOT EXISTS medical_records (
  id              uuid primary key default gen_random_uuid(),
  patient_id      uuid references patients(id),
  doctor_id       uuid references users(id),
  appointment_id  uuid,
  complaint       text,
  diagnosis       text,
  notes           text,
  created_at      timestamptz default now()
);

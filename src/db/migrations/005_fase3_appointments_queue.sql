-- Fase 3: Appointment, Antrian & Layar Display Dokter

CREATE TABLE IF NOT EXISTS appointments (
  id            uuid primary key default gen_random_uuid(),
  patient_id    uuid references patients(id),
  doctor_id     uuid references users(id),
  scheduled_at  timestamptz not null,
  queue_number  text,
  status        text not null default 'booked',
  booked_via    text default 'staff',
  created_at    timestamptz default now(),
  constraint appointments_status_check
    check (status in ('booked', 'checked_in', 'in_consultation', 'completed', 'cancelled', 'no_show')),
  constraint appointments_booked_via_check
    check (booked_via in ('staff', 'public_portal'))
);

CREATE TABLE IF NOT EXISTS doctor_schedules (
  id            uuid primary key default gen_random_uuid(),
  doctor_id     uuid references users(id),
  day_of_week   int not null,
  start_time    time not null,
  end_time      time not null,
  slot_minutes  int default 15,
  is_active     boolean default true,
  constraint doctor_schedules_day_of_week_check check (day_of_week between 0 and 6)
);

CREATE TABLE IF NOT EXISTS queue_calls (
  id            uuid primary key default gen_random_uuid(),
  queue_number  text not null,
  queue_type    text not null,
  called_by     uuid references users(id),
  called_at     timestamptz default now(),
  constraint queue_calls_queue_type_check check (queue_type in ('doctor', 'pharmacy'))
);

-- Deferred from the Fase 2 migration, which ran before `appointments` existed.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'medical_records_appointment_id_fkey'
  ) THEN
    ALTER TABLE medical_records
      ADD CONSTRAINT medical_records_appointment_id_fkey
      FOREIGN KEY (appointment_id) REFERENCES appointments(id);
  END IF;
END $$;

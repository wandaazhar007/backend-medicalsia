-- Fase 4: Konsultasi Dokter & Resep
--
-- `medicines` is created here too, ahead of the Fase 5 Farmasi phase — the
-- doctor's prescription picker needs real stock data to show, and
-- prescription_items has a hard FK to it. Fase 5 owns the write side
-- (POST /medicines, stock adjustments, medicine_stock_logs); this phase only
-- reads it.
CREATE TABLE IF NOT EXISTS medicines (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  unit             text not null,
  price            numeric(12,2) not null,
  stock_qty        int not null default 0,
  min_stock_alert  int default 10,
  expiry_date      date,
  is_active        boolean default true,
  created_at       timestamptz default now()
);

CREATE TABLE IF NOT EXISTS prescriptions (
  id                 uuid primary key default gen_random_uuid(),
  medical_record_id  uuid references medical_records(id),
  doctor_id          uuid references users(id),
  status             text not null default 'pending',
  created_at         timestamptz default now(),
  constraint prescriptions_status_check check (status in ('pending', 'paid', 'completed', 'cancelled'))
);

CREATE TABLE IF NOT EXISTS prescription_items (
  id               uuid primary key default gen_random_uuid(),
  prescription_id  uuid references prescriptions(id),
  medicine_id      uuid references medicines(id),
  dosage           text,
  quantity         int not null,
  instructions     text,
  status           text not null default 'pending',
  created_at       timestamptz default now(),
  constraint prescription_items_status_check
    check (status in ('pending', 'included', 'excluded', 'dispensed', 'shortfall'))
);

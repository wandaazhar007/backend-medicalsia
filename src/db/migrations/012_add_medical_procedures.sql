-- Tindakan Medis (medical procedures, e.g. suntik/nebulizer/jahit luka).
--
-- Separate from `services` (consultation/admin fees the cashier adds
-- manually) because procedures are performed and recorded by the doctor
-- during a consultation, then flow to the cashier automatically — mirrors
-- the medicines/prescriptions relationship in 006_fase4_prescriptions.sql.
CREATE TABLE IF NOT EXISTS medical_procedures (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  price       numeric(12,2) not null,
  is_active   boolean default true,
  created_at  timestamptz default now()
);

-- One row per consultation where the doctor performed procedures. No
-- dispensing step like prescriptions have (no stock involved) — status only
-- moves pending -> paid once the cashier's invoice for it is paid.
CREATE TABLE IF NOT EXISTS procedure_records (
  id                 uuid primary key default gen_random_uuid(),
  medical_record_id  uuid references medical_records(id),
  doctor_id          uuid references users(id),
  status             text not null default 'pending',
  created_at         timestamptz default now(),
  constraint procedure_records_status_check check (status in ('pending', 'paid', 'cancelled'))
);

CREATE TABLE IF NOT EXISTS procedure_record_items (
  id                    uuid primary key default gen_random_uuid(),
  procedure_record_id   uuid references procedure_records(id),
  medical_procedure_id  uuid references medical_procedures(id),
  quantity              int not null default 1,
  notes                 text,
  status                text not null default 'pending',
  created_at            timestamptz default now(),
  constraint procedure_record_items_status_check check (status in ('pending', 'included', 'excluded'))
);

ALTER TABLE invoices ADD COLUMN IF NOT EXISTS procedure_record_id uuid references procedure_records(id);

ALTER TABLE invoice_items DROP CONSTRAINT IF EXISTS invoice_items_item_type_check;
ALTER TABLE invoice_items ADD CONSTRAINT invoice_items_item_type_check
  CHECK (item_type IN ('consultation', 'service', 'medicine', 'procedure'));

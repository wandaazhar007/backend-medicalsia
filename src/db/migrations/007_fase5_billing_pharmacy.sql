-- Fase 5: Kasir (bayar dulu) & Farmasi (dispense/shortfall)

CREATE TABLE IF NOT EXISTS invoices (
  id               uuid primary key default gen_random_uuid(),
  patient_id       uuid references patients(id),
  prescription_id  uuid references prescriptions(id),
  total_amount     numeric(12,2) not null,
  status           text not null default 'unpaid',
  payment_method   text,
  paid_at          timestamptz,
  created_by       uuid references users(id),
  created_at       timestamptz default now(),
  constraint invoices_status_check check (status in ('unpaid', 'paid', 'cancelled')),
  constraint invoices_payment_method_check check (payment_method in ('cash', 'debit_card', 'credit_card', 'qris'))
);

CREATE TABLE IF NOT EXISTS invoice_items (
  id            uuid primary key default gen_random_uuid(),
  invoice_id    uuid references invoices(id),
  item_type     text not null,
  reference_id  uuid,
  description   text not null,
  price         numeric(12,2) not null,
  quantity      int not null default 1,
  subtotal      numeric(12,2) not null,
  constraint invoice_items_item_type_check check (item_type in ('consultation', 'service', 'medicine'))
);

CREATE TABLE IF NOT EXISTS prescription_shortfalls (
  id                     uuid primary key default gen_random_uuid(),
  prescription_item_id  uuid references prescription_items(id),
  invoice_id             uuid references invoices(id),
  qty_shortfall          int not null,
  refund_amount          numeric(12,2) not null,
  refund_status          text not null default 'pending',
  reported_by            uuid references users(id),
  resolved_by            uuid references users(id),
  resolved_at            timestamptz,
  created_at             timestamptz default now(),
  constraint prescription_shortfalls_refund_status_check check (refund_status in ('pending', 'completed'))
);

CREATE TABLE IF NOT EXISTS medicine_stock_logs (
  id           uuid primary key default gen_random_uuid(),
  medicine_id  uuid references medicines(id),
  change_qty   int not null,
  reason       text not null,
  created_by   uuid references users(id),
  created_at   timestamptz default now(),
  constraint medicine_stock_logs_reason_check check (reason in ('restock', 'dispensed', 'adjustment'))
);

-- Not in the original 02-data-model.md schema — needed so /public/queue/pharmacy
-- can tell how long ago a prescription became 'completed' and drop it from the
-- display a few minutes later (05-business-flow.md). See amendment note there.
ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS completed_at timestamptz;

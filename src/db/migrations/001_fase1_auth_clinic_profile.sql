-- Fase 1: Auth & Profil Klinik
-- Single-tenant per deployment: no clinic_id column, no multi-tenant RLS.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Holds exactly one row: the clinic profile for this deployment.
CREATE TABLE IF NOT EXISTS clinic_profile (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  address     text,
  phone       text,
  logo_url    text,
  created_at  timestamptz default now()
);

-- Role is a plain column since one deployment only ever serves one clinic.
CREATE TABLE IF NOT EXISTS users (
  id            uuid primary key default gen_random_uuid(),
  firebase_uid  text unique not null,
  full_name     text not null,
  phone         text,
  role          text not null,
  is_active     boolean default true,
  created_at    timestamptz default now(),
  constraint users_role_check check (role in ('owner', 'admin', 'doctor', 'receptionist', 'pharmacy', 'cashier'))
);

-- Consultation/procedure charges, referenced later by invoice_items in Fase 5.
CREATE TABLE IF NOT EXISTS services (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  price       numeric(12,2) not null,
  is_active   boolean default true
);

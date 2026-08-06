# backend-medicalsia

REST API for **Medicalsia** — a clinic management SaaS built for the Indonesian
market. This repo is deployed **once per clinic** (single-tenant): every
subscribing clinic gets its own instance, its own database, and its own `.env`.
There is no shared database, no `clinic_id` column, and no multi-tenant logic
anywhere in this codebase.

## Tech Stack

- **Runtime**: Node.js, Express (ES Modules — `"type": "module"`)
- **Database**: PostgreSQL (Supabase), accessed via raw parameterized SQL with
  [`pg`](https://www.npmjs.com/package/pg) — no ORM
- **Auth**: Firebase Admin SDK (verifies Firebase ID tokens issued by the
  frontend's Firebase Auth client SDK)
- **Other**: `express-rate-limit` (public booking endpoint), `dotenv`, `cors`

## Project Structure

```
index.js                  # Express app entry point, route mounting
src/
  config/                 # Firebase Admin + PostgreSQL pool setup
  controllers/             # One PascalCase controller per resource
  routes/                  # Route definitions (URL prefix declared per-file)
  middlewares/             # AuthMiddleware (Firebase token verify + role guard)
  services/                 # External integrations (WhatsApp, email, etc.)
  db/
    migrations/             # SQL migration files
    migrate.js               # Migration runner
    seed-owner.js             # One-off script to provision the first owner account
```

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Copy `.env.example` to `.env` and fill in the values for this clinic's
deployment (its own Supabase project, its own Firebase service account, its
own encryption key — never reuse values across clinic deployments):

```bash
cp .env.example .env
```

| Variable | Description |
|---|---|
| `PORT` | Port the API listens on (default `5017`) |
| `NODE_ENV` | `development` \| `production` |
| `DATABASE_URL` | Supabase/PostgreSQL connection string for **this clinic's** database |
| `FIREBASE_PROJECT_ID` / `FIREBASE_CLIENT_EMAIL` / `FIREBASE_PRIVATE_KEY` | Firebase Admin SDK service account credentials, used to verify staff login tokens |
| `ENCRYPTION_KEY` | Strong random key (e.g. 32-byte base64) used to encrypt `whatsapp_settings.device_token` and `email_settings.email_password` at rest |
| `WHATSAPP_PROVIDER_API_BASE` | WhatsApp gateway API base (e.g. Fonnte) — per-clinic device tokens live encrypted in the database, not here |
| `REMINDER_CRON_SCHEDULE` | Cron expression for the appointment-reminder job |

### 3. Run database migrations

```bash
npm run migrate
```

### 4. Seed the first owner account (Fase 0 onboarding)

```bash
node src/db/seed-owner.js <email> [full_name]
```

The email must already exist as a Firebase Auth user (staff accounts are
provisioned manually — there is no self-service signup).

### 5. Start the server

```bash
npm run dev     # auto-restart on file changes (node --watch)
npm start        # production
```

## API Conventions

- Every list endpoint supports `page`, `limit`, and live `search` query params,
  returning `{ data, pagination }`.
- Errors follow `{ error: { code, message } }`.
- Public routes (`/api/public/*`) are never wrapped in Firebase auth — they
  power the unauthenticated `/booking`, `/display`, and `/display-pharmacy`
  pages in `frontend-medicalsia`.
- Payment must complete (`invoices.status = 'paid'`) before pharmacy can
  dispense a prescription — this ordering is enforced in the controller, not
  just assumed from the UI flow.

## Deploying a New Clinic

This repo is a **template cloned per clinic**, not a shared multi-tenant
service. Provisioning a new clinic means: a new Supabase project, a new
Firebase project (or a new service account within one), a fresh `.env`, and a
new PM2 process behind its own Nginx reverse proxy / subdomain.

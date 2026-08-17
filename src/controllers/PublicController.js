import pool from '../config/db.js';

// GET /public/booking/doctors — active doctors with their active weekly
// schedules, plus already-booked slots for the next 30 days so the booking
// page can exclude taken times client-side.
async function getBookingDoctors(req, res) {
  const { rows: doctors } = await pool.query(
    `SELECT id, full_name FROM users WHERE role = 'doctor' AND is_active = true ORDER BY full_name ASC`
  );

  if (doctors.length === 0) {
    return res.json({ data: [] });
  }

  const doctorIds = doctors.map((d) => d.id);

  const { rows: schedules } = await pool.query(
    `SELECT doctor_id, id, day_of_week, start_time, end_time, slot_minutes
     FROM doctor_schedules
     WHERE doctor_id = ANY($1) AND is_active = true
     ORDER BY day_of_week ASC`,
    [doctorIds]
  );

  const { rows: booked } = await pool.query(
    `SELECT doctor_id, scheduled_at
     FROM appointments
     WHERE doctor_id = ANY($1)
       AND scheduled_at BETWEEN NOW() AND NOW() + INTERVAL '30 days'
       AND status NOT IN ('cancelled', 'no_show')`,
    [doctorIds]
  );

  const data = doctors.map((doctor) => ({
    id: doctor.id,
    full_name: doctor.full_name,
    schedules: schedules.filter((s) => s.doctor_id === doctor.id).map(({ doctor_id, ...rest }) => rest),
    booked_slots: booked.filter((b) => b.doctor_id === doctor.id).map((b) => b.scheduled_at),
  }));

  res.json({ data });
}

// Finds an existing patient by phone, or creates a bare-bones record — the
// full registration (NIK, DOB, address, etc.) happens later at check-in.
// This keeps the documented `patients`/`appointments` schema unchanged
// instead of adding guest-only columns to `appointments`.
async function findOrCreatePatientByPhone(full_name, phone) {
  if (phone) {
    const { rows } = await pool.query('SELECT id FROM patients WHERE phone = $1 LIMIT 1', [phone]);
    if (rows[0]) return rows[0].id;
  }

  const { rows } = await pool.query(
    'INSERT INTO patients (full_name, phone) VALUES ($1, $2) RETURNING id',
    [full_name, phone || null]
  );
  return rows[0].id;
}

// GET /public/booking/check-phone — lets the booking page tell an existing
// patient apart from a new one before they submit, so it can prefill their
// name. Matching strips non-digits on both sides so it works regardless of
// whether the stored phone has dash formatting or not.
async function checkPhone(req, res) {
  const digits = String(req.query.phone || '').replace(/\D/g, '');

  if (digits.length < 9) {
    return res.json({ data: null });
  }

  const { rows } = await pool.query(
    `SELECT full_name FROM patients WHERE regexp_replace(phone, '\\D', '', 'g') = $1 LIMIT 1`,
    [digits]
  );

  res.json({ data: rows[0] || null });
}

// POST /public/booking — patient books their own appointment, no login.
async function createBooking(req, res) {
  const { doctor_id, scheduled_at, full_name, phone } = req.body;

  if (!doctor_id || !scheduled_at || !full_name) {
    return res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'doctor_id, scheduled_at, and full_name are required' },
    });
  }

  const patientId = await findOrCreatePatientByPhone(full_name, phone);

  const { rows } = await pool.query(
    `INSERT INTO appointments (patient_id, doctor_id, scheduled_at, booked_via)
     VALUES ($1, $2, $3, 'public_portal')
     RETURNING id, scheduled_at, status`,
    [patientId, doctor_id, scheduled_at]
  );

  res.status(201).json({ data: rows[0] });
}

// GET /public/queue — polled by the waiting-room display; only the doctor
// queue's most recent call matters here (one big number, not a list — see
// 06-design-system.md).
async function getQueue(req, res) {
  const { rows } = await pool.query(
    `SELECT id, queue_number, called_at
     FROM queue_calls
     WHERE queue_type = 'doctor'
     ORDER BY called_at DESC
     LIMIT 1`
  );

  res.json({ last_call: rows[0] || null });
}

// "Beberapa menit" isn't pinned to an exact number in 05-business-flow.md —
// 10 minutes is a reasonable default for how long a completed prescription
// stays visible as "Siap Diambil" before dropping off the display.
const COMPLETED_DISPLAY_MINUTES = 10;

// GET /public/queue/pharmacy — polled by the pharmacy waiting-room display.
// queue_number is never generated fresh here — it's the same one assigned
// at doctor check-in, reached via prescriptions -> medical_records -> appointments.
async function getPharmacyQueue(req, res) {
  const { rows } = await pool.query(
    `SELECT a.queue_number,
            CASE WHEN p.status = 'paid' THEN 'sedang_disiapkan' ELSE 'siap_diambil' END AS status
     FROM prescriptions p
     JOIN medical_records mr ON mr.id = p.medical_record_id
     JOIN appointments a ON a.id = mr.appointment_id
     WHERE a.queue_number IS NOT NULL
       AND (
         p.status = 'paid'
         OR (p.status = 'completed' AND p.completed_at >= now() - ($1 || ' minutes')::interval)
       )
     ORDER BY p.created_at ASC`,
    [COMPLETED_DISPLAY_MINUTES]
  );

  const { rows: lastCallRows } = await pool.query(
    `SELECT id, queue_number, called_at
     FROM queue_calls
     WHERE queue_type = 'pharmacy'
     ORDER BY called_at DESC
     LIMIT 1`
  );

  res.json({ data: rows, last_call: lastCallRows[0] || null });
}

export default { getBookingDoctors, checkPhone, createBooking, getQueue, getPharmacyQueue };

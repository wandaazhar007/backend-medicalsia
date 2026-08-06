import pool from '../config/db.js';

const STATUS_VALUES = ['booked', 'checked_in', 'in_consultation', 'completed', 'cancelled', 'no_show'];

// GET /appointments?page=&limit=&search=&date=&doctor_id=&status=
// search matches patient name; date/doctor_id/status are exact-match filters.
async function list(req, res) {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
  const { search, date, doctor_id, status } = req.query;
  const offset = (page - 1) * limit;

  const conditions = [];
  const params = [];

  if (search) {
    params.push(`%${search}%`);
    conditions.push(`p.full_name ILIKE $${params.length}`);
  }
  if (date) {
    params.push(date);
    conditions.push(`a.scheduled_at::date = $${params.length}`);
  }
  if (doctor_id) {
    params.push(doctor_id);
    conditions.push(`a.doctor_id = $${params.length}`);
  }
  if (status) {
    params.push(status);
    conditions.push(`a.status = $${params.length}`);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const { rows: countRows } = await pool.query(
    `SELECT COUNT(*)::int AS total
     FROM appointments a
     JOIN patients p ON p.id = a.patient_id
     ${whereClause}`,
    params
  );
  const totalItems = countRows[0].total;

  const { rows } = await pool.query(
    `SELECT a.id, a.scheduled_at, a.queue_number, a.status, a.booked_via, a.created_at,
            p.id AS patient_id, p.full_name AS patient_name, p.patient_number,
            d.id AS doctor_id, d.full_name AS doctor_name
     FROM appointments a
     JOIN patients p ON p.id = a.patient_id
     LEFT JOIN users d ON d.id = a.doctor_id
     ${whereClause}
     ORDER BY a.scheduled_at DESC
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset]
  );

  res.json({
    data: rows,
    pagination: {
      page,
      limit,
      total_items: totalItems,
      total_pages: Math.ceil(totalItems / limit),
    },
  });
}

// GET /appointments/:id — used by the consultation page to load patient/doctor
// context for one specific appointment.
async function getById(req, res) {
  const { id } = req.params;

  const { rows } = await pool.query(
    `SELECT a.id, a.scheduled_at, a.queue_number, a.status, a.booked_via, a.created_at,
            p.id AS patient_id, p.full_name AS patient_name, p.patient_number,
            d.id AS doctor_id, d.full_name AS doctor_name
     FROM appointments a
     JOIN patients p ON p.id = a.patient_id
     LEFT JOIN users d ON d.id = a.doctor_id
     WHERE a.id = $1`,
    [id]
  );

  if (!rows[0]) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Appointment not found' } });
  }

  res.json({ data: rows[0] });
}

// POST /appointments — manual booking by staff (reception), always booked_via='staff'.
async function create(req, res) {
  const { patient_id, doctor_id, scheduled_at } = req.body;

  if (!patient_id || !scheduled_at) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'patient_id and scheduled_at are required' } });
  }

  const { rows } = await pool.query(
    `INSERT INTO appointments (patient_id, doctor_id, scheduled_at, booked_via)
     VALUES ($1, $2, $3, 'staff')
     RETURNING *`,
    [patient_id, doctor_id || null, scheduled_at]
  );

  res.status(201).json({ data: rows[0] });
}

// Next queue number for today, e.g. "A12" — plain incrementing count of
// today's already-assigned numbers, not a DB sequence like patient_number,
// since queue numbers reset daily rather than growing forever. Assumes
// check-in happens same-day as scheduled_at (true for walk-in/queue use),
// not guarded against concurrent check-ins beyond MVP clinic scale.
async function getNextQueueNumber() {
  const { rows } = await pool.query(
    `SELECT COUNT(*)::int AS count FROM appointments
     WHERE queue_number IS NOT NULL AND scheduled_at::date = CURRENT_DATE`
  );
  return `A${rows[0].count + 1}`;
}

// PATCH /appointments/:id/status — drives the booked -> checked_in ->
// in_consultation -> completed/cancelled/no_show flow (05-business-flow.md).
async function updateStatus(req, res) {
  const { id } = req.params;
  const { status } = req.body;

  if (!STATUS_VALUES.includes(status)) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: `status must be one of: ${STATUS_VALUES.join(', ')}` } });
  }

  const { rows: existingRows } = await pool.query('SELECT * FROM appointments WHERE id = $1', [id]);
  const appointment = existingRows[0];

  if (!appointment) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Appointment not found' } });
  }

  const queueNumber = status === 'checked_in' && !appointment.queue_number ? await getNextQueueNumber() : appointment.queue_number;

  const { rows } = await pool.query(
    `UPDATE appointments SET status = $1, queue_number = $2 WHERE id = $3 RETURNING *`,
    [status, queueNumber, id]
  );

  res.json({ data: rows[0] });
}

export default { list, getById, create, updateStatus };

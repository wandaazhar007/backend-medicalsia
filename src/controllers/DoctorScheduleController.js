import pool from '../config/db.js';

// GET /doctor-schedules — no pagination, the whole roster is expected to be small.
async function list(req, res) {
  // There's no FK from appointments to doctor_schedules, so "tied to other
  // data" is derived: any appointment for this doctor that falls on the
  // same day-of-week and inside the schedule's time window.
  const { rows } = await pool.query(
    `SELECT ds.id, ds.doctor_id, u.full_name AS doctor_name, ds.day_of_week, ds.start_time, ds.end_time, ds.slot_minutes, ds.is_active,
       EXISTS (
         SELECT 1 FROM appointments a
         WHERE a.doctor_id = ds.doctor_id
           AND EXTRACT(DOW FROM a.scheduled_at) = ds.day_of_week
           AND a.scheduled_at::time >= ds.start_time
           AND a.scheduled_at::time < ds.end_time
       ) AS has_appointments
     FROM doctor_schedules ds
     JOIN users u ON u.id = ds.doctor_id
     ORDER BY u.full_name ASC, ds.day_of_week ASC`
  );

  res.json({ data: rows });
}

async function create(req, res) {
  const { doctor_id, day_of_week, start_time, end_time, slot_minutes } = req.body;

  if (!doctor_id || day_of_week === undefined || !start_time || !end_time) {
    return res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'doctor_id, day_of_week, start_time, and end_time are required' },
    });
  }

  const { rows } = await pool.query(
    `INSERT INTO doctor_schedules (doctor_id, day_of_week, start_time, end_time, slot_minutes)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [doctor_id, day_of_week, start_time, end_time, slot_minutes || 15]
  );

  res.status(201).json({ data: rows[0] });
}

async function update(req, res) {
  const { id } = req.params;
  const { day_of_week, start_time, end_time, slot_minutes, is_active } = req.body;

  const { rows } = await pool.query(
    `UPDATE doctor_schedules
     SET day_of_week = COALESCE($1, day_of_week),
         start_time = COALESCE($2, start_time),
         end_time = COALESCE($3, end_time),
         slot_minutes = COALESCE($4, slot_minutes),
         is_active = COALESCE($5, is_active)
     WHERE id = $6
     RETURNING *`,
    [day_of_week ?? null, start_time ?? null, end_time ?? null, slot_minutes ?? null, is_active ?? null, id]
  );

  if (!rows[0]) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Doctor schedule not found' } });
  }

  res.json({ data: rows[0] });
}

async function remove(req, res) {
  const { id } = req.params;

  const { rows: existing } = await pool.query(
    'SELECT doctor_id, day_of_week, start_time, end_time FROM doctor_schedules WHERE id = $1',
    [id]
  );
  if (!existing[0]) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Doctor schedule not found' } });
  }

  const { doctor_id, day_of_week, start_time, end_time } = existing[0];
  const { rows: tied } = await pool.query(
    `SELECT 1 FROM appointments
     WHERE doctor_id = $1
       AND EXTRACT(DOW FROM scheduled_at) = $2
       AND scheduled_at::time >= $3
       AND scheduled_at::time < $4
     LIMIT 1`,
    [doctor_id, day_of_week, start_time, end_time]
  );
  if (tied.length > 0) {
    return res.status(409).json({
      error: { code: 'SCHEDULE_IN_USE', message: 'Schedule already has appointments and cannot be deleted' },
    });
  }

  await pool.query('DELETE FROM doctor_schedules WHERE id = $1', [id]);
  res.status(204).send();
}

export default { list, create, update, remove };

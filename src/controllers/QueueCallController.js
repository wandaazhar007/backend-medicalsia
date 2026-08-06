import pool from '../config/db.js';

// POST /queue-calls — records a new call so display screens (which poll)
// can detect it and trigger the announcement. Doctor and pharmacy calls
// share this one table, distinguished only by queue_type.
async function create(req, res) {
  const { queue_number, queue_type } = req.body;

  if (!queue_number || !['doctor', 'pharmacy'].includes(queue_type)) {
    return res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: "queue_number is required and queue_type must be 'doctor' or 'pharmacy'" },
    });
  }

  const { rows } = await pool.query(
    `INSERT INTO queue_calls (queue_number, queue_type, called_by)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [queue_number, queue_type, req.user.id]
  );

  res.status(201).json({ data: rows[0] });
}

export default { create };

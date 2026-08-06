import pool from '../config/db.js';

// GET /shortfalls?status= — cashier dashboard's pending-refund list. No
// pagination: shortfalls are meant to be resolved quickly, so the pending
// queue stays small in practice.
async function list(req, res) {
  const { status } = req.query;

  const whereClause = status ? 'WHERE ps.refund_status = $1' : '';
  const params = status ? [status] : [];

  const { rows } = await pool.query(
    `SELECT ps.id, ps.qty_shortfall, ps.refund_amount, ps.refund_status, ps.created_at, ps.resolved_at,
            m.name AS medicine_name, i.id AS invoice_id, p.full_name AS patient_name
     FROM prescription_shortfalls ps
     JOIN prescription_items pi ON pi.id = ps.prescription_item_id
     JOIN medicines m ON m.id = pi.medicine_id
     LEFT JOIN invoices i ON i.id = ps.invoice_id
     LEFT JOIN patients p ON p.id = i.patient_id
     ${whereClause}
     ORDER BY ps.created_at DESC`,
    params
  );

  res.json({ data: rows });
}

// PATCH /shortfalls/:id/resolve — cashier already refunded the patient
// manually (cash/transfer, outside the system); this just records it.
async function resolve(req, res) {
  const { id } = req.params;

  const { rows } = await pool.query(
    `UPDATE prescription_shortfalls
     SET refund_status = 'completed', resolved_by = $1, resolved_at = now()
     WHERE id = $2
     RETURNING *`,
    [req.user.id, id]
  );

  if (!rows[0]) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Shortfall not found' } });
  }

  res.json({ data: rows[0] });
}

export default { list, resolve };

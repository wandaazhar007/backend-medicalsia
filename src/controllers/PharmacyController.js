import pool from '../config/db.js';

// GET /pharmacy/queue — prescriptions ready to dispense. The status = 'paid'
// filter is enforced here in the query itself, not left to the frontend, so
// pharmacy can never see (let alone dispense) an unpaid prescription.
async function getQueue(req, res) {
  const { rows: prescriptions } = await pool.query(
    `SELECT p.id, p.status, p.created_at, pat.id AS patient_id, pat.full_name AS patient_name, a.queue_number
     FROM prescriptions p
     JOIN medical_records mr ON mr.id = p.medical_record_id
     JOIN patients pat ON pat.id = mr.patient_id
     LEFT JOIN appointments a ON a.id = mr.appointment_id
     WHERE p.status = 'paid'
     ORDER BY p.created_at ASC`
  );

  for (const prescription of prescriptions) {
    const { rows: items } = await pool.query(
      `SELECT pi.id, pi.dosage, pi.quantity, pi.instructions,
              m.id AS medicine_id, m.name AS medicine_name, m.stock_qty
       FROM prescription_items pi
       JOIN medicines m ON m.id = pi.medicine_id
       WHERE pi.prescription_id = $1 AND pi.status = 'included'
       ORDER BY pi.created_at ASC`,
      [prescription.id]
    );
    prescription.items = items;
  }

  res.json({ data: prescriptions });
}

// POST /pharmacy/dispense/:prescriptionId — body: { items: [{ prescription_item_id, dispensed_qty }] }.
// dispensed_qty is what pharmacy staff can actually hand over after checking
// physical stock; if it's less than prescribed, the shortfall is recorded
// for a cashier refund instead of blocking the rest of the dispense.
async function dispense(req, res) {
  const { prescriptionId } = req.params;
  const { items } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'At least one item is required' } });
  }

  const { rows: prescriptionRows } = await pool.query('SELECT * FROM prescriptions WHERE id = $1', [prescriptionId]);
  const prescription = prescriptionRows[0];

  if (!prescription) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Prescription not found' } });
  }
  // Redundant with the getQueue filter, but this is the endpoint that
  // actually moves stock — it must refuse an unpaid prescription even if
  // called directly, not just rely on the queue never showing it.
  if (prescription.status !== 'paid') {
    return res.status(400).json({ error: { code: 'INVALID_STATUS', message: 'Only paid prescriptions can be dispensed' } });
  }

  const { rows: invoiceRows } = await pool.query('SELECT id FROM invoices WHERE prescription_id = $1', [prescriptionId]);
  const invoiceId = invoiceRows[0]?.id || null;

  for (const { prescription_item_id, dispensed_qty } of items) {
    const { rows: itemRows } = await pool.query(
      `SELECT pi.*, m.price, m.stock_qty
       FROM prescription_items pi
       JOIN medicines m ON m.id = pi.medicine_id
       WHERE pi.id = $1 AND pi.prescription_id = $2`,
      [prescription_item_id, prescriptionId]
    );
    const item = itemRows[0];

    // Skip anything already resolved (dispensed/shortfall) or excluded at
    // the cashier — only 'included' items are dispensable.
    if (!item || item.status !== 'included') continue;

    const givenQty = Math.max(0, Math.min(dispensed_qty ?? item.quantity, item.quantity, item.stock_qty));
    const shortfallQty = item.quantity - givenQty;

    if (givenQty > 0) {
      await pool.query('UPDATE medicines SET stock_qty = stock_qty - $1 WHERE id = $2', [givenQty, item.medicine_id]);
      await pool.query(
        `INSERT INTO medicine_stock_logs (medicine_id, change_qty, reason, created_by)
         VALUES ($1, $2, 'dispensed', $3)`,
        [item.medicine_id, -givenQty, req.user.id]
      );
    }

    const newStatus = shortfallQty > 0 ? 'shortfall' : 'dispensed';
    await pool.query('UPDATE prescription_items SET status = $1 WHERE id = $2', [newStatus, prescription_item_id]);

    if (shortfallQty > 0) {
      const refundAmount = shortfallQty * item.price;
      await pool.query(
        `INSERT INTO prescription_shortfalls (prescription_item_id, invoice_id, qty_shortfall, refund_amount, reported_by)
         VALUES ($1, $2, $3, $4, $5)`,
        [prescription_item_id, invoiceId, shortfallQty, refundAmount, req.user.id]
      );
    }
  }

  // Once every non-excluded item has been resolved (dispensed or shortfall),
  // the whole prescription is done.
  const { rows: remaining } = await pool.query(
    `SELECT COUNT(*)::int AS count FROM prescription_items WHERE prescription_id = $1 AND status = 'included'`,
    [prescriptionId]
  );

  let updatedPrescription = prescription;
  if (remaining[0].count === 0) {
    const { rows } = await pool.query(
      `UPDATE prescriptions SET status = 'completed', completed_at = now() WHERE id = $1 RETURNING *`,
      [prescriptionId]
    );
    updatedPrescription = rows[0];
  }

  res.json({ data: updatedPrescription });
}

export default { getQueue, dispense };

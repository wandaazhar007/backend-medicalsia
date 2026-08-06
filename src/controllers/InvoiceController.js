import pool from '../config/db.js';

const PAYMENT_METHODS = ['cash', 'debit_card', 'credit_card', 'qris'];

// GET /invoices?page=&limit=&search= — search matches patient name.
async function list(req, res) {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
  const search = req.query.search ? `%${req.query.search}%` : null;
  const offset = (page - 1) * limit;

  const whereClause = search ? 'WHERE p.full_name ILIKE $1' : '';
  const params = search ? [search] : [];

  const { rows: countRows } = await pool.query(
    `SELECT COUNT(*)::int AS total FROM invoices i JOIN patients p ON p.id = i.patient_id ${whereClause}`,
    params
  );
  const totalItems = countRows[0].total;

  const { rows } = await pool.query(
    `SELECT i.id, i.total_amount, i.status, i.payment_method, i.paid_at, i.created_at,
            p.id AS patient_id, p.full_name AS patient_name
     FROM invoices i
     JOIN patients p ON p.id = i.patient_id
     ${whereClause}
     ORDER BY i.created_at DESC
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

// GET /invoices/:id — full detail for the receipt print and for checking
// pending shortfalls on this invoice.
async function getById(req, res) {
  const { id } = req.params;

  const { rows: invoiceRows } = await pool.query(
    `SELECT i.*, p.full_name AS patient_name, p.patient_number
     FROM invoices i
     JOIN patients p ON p.id = i.patient_id
     WHERE i.id = $1`,
    [id]
  );
  const invoice = invoiceRows[0];

  if (!invoice) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Invoice not found' } });
  }

  const { rows: items } = await pool.query(
    'SELECT id, item_type, reference_id, description, price, quantity, subtotal FROM invoice_items WHERE invoice_id = $1',
    [id]
  );

  const { rows: shortfalls } = await pool.query(
    `SELECT ps.id, ps.qty_shortfall, ps.refund_amount, ps.refund_status, m.name AS medicine_name
     FROM prescription_shortfalls ps
     JOIN prescription_items pi ON pi.id = ps.prescription_item_id
     JOIN medicines m ON m.id = pi.medicine_id
     WHERE ps.invoice_id = $1`,
    [id]
  );

  res.json({ data: { ...invoice, items, shortfalls } });
}

// POST /invoices — cashier builds the draft from consultation/service fees
// plus prescription_items. `excluded_prescription_item_ids` moves those
// items to 'excluded' (out of stock, bought elsewhere); everything else on
// the prescription moves to 'included' — this is the point where
// prescription_items leave 'pending' (see 04-architecture-conventions.md).
async function create(req, res) {
  const { patient_id, prescription_id, items, excluded_prescription_item_ids } = req.body;

  if (!patient_id || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'patient_id and at least one item are required' },
    });
  }

  if (prescription_id) {
    const excludedIds = excluded_prescription_item_ids || [];
    const { rows: prescriptionItems } = await pool.query(
      'SELECT id FROM prescription_items WHERE prescription_id = $1',
      [prescription_id]
    );

    for (const item of prescriptionItems) {
      const nextStatus = excludedIds.includes(item.id) ? 'excluded' : 'included';
      await pool.query('UPDATE prescription_items SET status = $1 WHERE id = $2', [nextStatus, item.id]);
    }
  }

  const totalAmount = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const { rows: invoiceRows } = await pool.query(
    `INSERT INTO invoices (patient_id, prescription_id, total_amount, created_by)
     VALUES ($1, $2, $3, $4)
     RETURNING id, status, total_amount`,
    [patient_id, prescription_id || null, totalAmount, req.user.id]
  );
  const invoice = invoiceRows[0];

  for (const item of items) {
    await pool.query(
      `INSERT INTO invoice_items (invoice_id, item_type, reference_id, description, price, quantity, subtotal)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [invoice.id, item.item_type, item.reference_id || null, item.description, item.price, item.quantity, item.price * item.quantity]
    );
  }

  res.status(201).json({ data: invoice });
}

// PATCH /invoices/:id/pay — cashier already collected payment physically
// (cash/EDC/QRIS terminal); this only records the method and timestamp.
async function pay(req, res) {
  const { id } = req.params;
  const { payment_method } = req.body;

  if (!PAYMENT_METHODS.includes(payment_method)) {
    return res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: `payment_method must be one of: ${PAYMENT_METHODS.join(', ')}` },
    });
  }

  const { rows: existingRows } = await pool.query('SELECT * FROM invoices WHERE id = $1', [id]);
  const invoice = existingRows[0];

  if (!invoice) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Invoice not found' } });
  }
  if (invoice.status !== 'unpaid') {
    return res.status(400).json({ error: { code: 'INVALID_STATUS', message: 'Only unpaid invoices can be marked as paid' } });
  }

  const { rows } = await pool.query(
    `UPDATE invoices SET status = 'paid', payment_method = $1, paid_at = now() WHERE id = $2
     RETURNING id, status, payment_method, paid_at`,
    [payment_method, id]
  );

  // Payment happens before pharmacy dispensing, always — this is the one
  // place prescriptions.status becomes 'paid' (05-business-flow.md).
  if (invoice.prescription_id) {
    await pool.query(`UPDATE prescriptions SET status = 'paid' WHERE id = $1`, [invoice.prescription_id]);
  }

  res.json({ data: rows[0] });
}

export default { list, getById, create, pay };

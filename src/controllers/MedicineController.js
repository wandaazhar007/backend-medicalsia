import pool from '../config/db.js';

// GET /medicines?page=&limit=&search=
async function list(req, res) {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
  const search = req.query.search ? `%${req.query.search}%` : null;
  const offset = (page - 1) * limit;

  const whereClause = search ? 'WHERE name ILIKE $1' : '';
  const params = search ? [search] : [];

  const { rows: countRows } = await pool.query(
    `SELECT COUNT(*)::int AS total FROM medicines ${whereClause}`,
    params
  );
  const totalItems = countRows[0].total;

  const { rows } = await pool.query(
    `SELECT id, name, unit, price, stock_qty, min_stock_alert, expiry_date, is_active
     FROM medicines
     ${whereClause}
     ORDER BY name ASC
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

// GET /medicines/:id
async function getById(req, res) {
  const { id } = req.params;

  const { rows } = await pool.query(
    `SELECT id, name, unit, price, stock_qty, min_stock_alert, expiry_date, is_active
     FROM medicines WHERE id = $1`,
    [id]
  );

  if (!rows[0]) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Medicine not found' } });
  }

  res.json({ data: rows[0] });
}

// POST /medicines — initial stock_qty (if any) is logged as a 'restock' row
// too, so medicine_stock_logs stays a complete history from the moment a
// medicine exists, not just from its first dispense/manual adjustment.
async function create(req, res) {
  const { name, unit, price, stock_qty, min_stock_alert, expiry_date } = req.body;

  if (!name || !unit || price === undefined) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'name, unit, and price are required' } });
  }

  const initialStock = Number.isFinite(stock_qty) ? Math.max(0, stock_qty) : 0;

  const { rows } = await pool.query(
    `INSERT INTO medicines (name, unit, price, stock_qty, min_stock_alert, expiry_date)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, name, unit, price, stock_qty, min_stock_alert, expiry_date, is_active`,
    [name, unit, price, initialStock, min_stock_alert ?? 10, expiry_date || null]
  );
  const medicine = rows[0];

  if (initialStock > 0) {
    await pool.query(
      `INSERT INTO medicine_stock_logs (medicine_id, change_qty, reason, created_by)
       VALUES ($1, $2, 'restock', $3)`,
      [medicine.id, initialStock, req.user.id]
    );
  }

  res.status(201).json({ data: medicine });
}

// PATCH /medicines/:id — master-data fields only. stock_qty is deliberately
// excluded here and lives behind updateStock instead, so every stock change
// keeps a matching medicine_stock_logs row (see 02-data-model.md deviation note).
async function update(req, res) {
  const { id } = req.params;
  const { name, unit, price, min_stock_alert, expiry_date, is_active } = req.body;

  const { rows } = await pool.query(
    `UPDATE medicines
     SET name = COALESCE($1, name),
         unit = COALESCE($2, unit),
         price = COALESCE($3, price),
         min_stock_alert = COALESCE($4, min_stock_alert),
         expiry_date = COALESCE($5, expiry_date),
         is_active = COALESCE($6, is_active)
     WHERE id = $7
     RETURNING id, name, unit, price, stock_qty, min_stock_alert, expiry_date, is_active`,
    [name ?? null, unit ?? null, price ?? null, min_stock_alert ?? null, expiry_date || null, is_active ?? null, id]
  );

  if (!rows[0]) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Medicine not found' } });
  }

  res.json({ data: rows[0] });
}

// PATCH /medicines/:id/stock — body: { change_qty, reason }. 'restock' must
// be a positive delivery; 'adjustment' covers corrections (damage, recount)
// and can be negative, but never past zero.
async function updateStock(req, res) {
  const { id } = req.params;
  const { change_qty, reason } = req.body;

  if (!Number.isInteger(change_qty) || change_qty === 0) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'change_qty must be a non-zero integer' } });
  }
  if (!['restock', 'adjustment'].includes(reason)) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: "reason must be 'restock' or 'adjustment'" } });
  }
  if (reason === 'restock' && change_qty < 0) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'restock cannot be negative' } });
  }

  const { rows: medicineRows } = await pool.query('SELECT stock_qty FROM medicines WHERE id = $1', [id]);
  const medicine = medicineRows[0];

  if (!medicine) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Medicine not found' } });
  }
  if (medicine.stock_qty + change_qty < 0) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Stock cannot go below zero' } });
  }

  const { rows } = await pool.query(
    `UPDATE medicines SET stock_qty = stock_qty + $1 WHERE id = $2
     RETURNING id, name, unit, price, stock_qty, min_stock_alert, expiry_date, is_active`,
    [change_qty, id]
  );

  await pool.query(
    `INSERT INTO medicine_stock_logs (medicine_id, change_qty, reason, created_by)
     VALUES ($1, $2, $3, $4)`,
    [id, change_qty, reason, req.user.id]
  );

  res.json({ data: rows[0] });
}

// GET /medicines/:id/stock-logs — full audit trail: restock/adjustment made
// here, plus 'dispensed' rows written by PharmacyController.dispense.
async function getStockLogs(req, res) {
  const { id } = req.params;

  const { rows } = await pool.query(
    `SELECT l.id, l.change_qty, l.reason, l.created_at, u.full_name AS created_by_name
     FROM medicine_stock_logs l
     LEFT JOIN users u ON u.id = l.created_by
     WHERE l.medicine_id = $1
     ORDER BY l.created_at DESC
     LIMIT 100`,
    [id]
  );

  res.json({ data: rows });
}

export default { list, getById, create, update, updateStock, getStockLogs };

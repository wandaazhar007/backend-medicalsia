import pool from '../config/db.js';
import { normalizeRowKeys, parseImportFile } from '../utils/ImportFileParser.js';

// Header aliases (case-insensitive) so staff can prepare the import file in
// Indonesian, matching the column names they'd naturally use in Excel.
const HEADER_ALIASES = {
  name: ['name', 'nama', 'nama tindakan'],
  price: ['price', 'harga'],
};

const ALL_HEADER_ALIASES = Object.values(HEADER_ALIASES).flat();

// Shared by importPreview (informational only) and importCommit (defensive
// re-check — never trust the rows the client sends back as-is).
function validateProcedureRow(raw, rowNumber) {
  const row = normalizeRowKeys(raw, HEADER_ALIASES);

  if (!row.name || !row.price) {
    return { row_number: rowNumber, valid: false, error: 'name and price are required' };
  }

  const price = Number(row.price);
  if (!Number.isFinite(price) || price < 0) {
    return { row_number: rowNumber, valid: false, error: 'price must be a non-negative number' };
  }

  return {
    row_number: rowNumber,
    valid: true,
    data: { name: row.name, price },
  };
}

// GET /medical-procedures?page=&limit=&search=
async function list(req, res) {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
  const search = req.query.search ? `%${req.query.search}%` : null;
  const offset = (page - 1) * limit;

  const whereClause = search ? 'WHERE name ILIKE $1' : '';
  const params = search ? [search] : [];

  const { rows: countRows } = await pool.query(
    `SELECT COUNT(*)::int AS total FROM medical_procedures ${whereClause}`,
    params
  );
  const totalItems = countRows[0].total;

  const { rows } = await pool.query(
    `SELECT id, name, price, is_active
     FROM medical_procedures
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

async function create(req, res) {
  const { name, price } = req.body;

  if (!name || price === undefined) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'name and price are required' } });
  }

  const { rows } = await pool.query(
    'INSERT INTO medical_procedures (name, price) VALUES ($1, $2) RETURNING id, name, price, is_active',
    [name, price]
  );

  res.status(201).json({ data: rows[0] });
}

async function update(req, res) {
  const { id } = req.params;
  const { name, price, is_active } = req.body;

  const { rows } = await pool.query(
    `UPDATE medical_procedures
     SET name = COALESCE($1, name),
         price = COALESCE($2, price),
         is_active = COALESCE($3, is_active)
     WHERE id = $4
     RETURNING id, name, price, is_active`,
    [name ?? null, price ?? null, is_active ?? null, id]
  );

  if (!rows[0]) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Medical procedure not found' } });
  }

  res.json({ data: rows[0] });
}

// POST /medical-procedures/import/preview — parses + validates only, no DB writes.
async function importPreview(req, res) {
  if (!req.file) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'file is required' } });
  }

  let rawRows;
  try {
    rawRows = parseImportFile(req.file, ALL_HEADER_ALIASES);
  } catch {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Could not parse the uploaded file' } });
  }

  const rows = rawRows.map((raw, index) => validateProcedureRow(raw, index + 1));
  const validCount = rows.filter((r) => r.valid).length;

  res.json({
    data: {
      rows,
      summary: { total: rows.length, valid: validCount, invalid: rows.length - validCount },
    },
  });
}

// POST /medical-procedures/import — body: { rows: [{ name, price }] }, the
// normalized `data` shape returned by importPreview. Re-validated defensively
// per row rather than trusting the client; inserted sequentially (not in a
// transaction) so a bad row is reported and skipped instead of rolling back
// rows that were already good.
async function importCommit(req, res) {
  const { rows } = req.body;

  if (!Array.isArray(rows) || rows.length === 0) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'rows must be a non-empty array' } });
  }

  let imported = 0;
  const failed = [];

  for (let i = 0; i < rows.length; i += 1) {
    const check = validateProcedureRow(rows[i], i + 1);
    if (!check.valid) {
      failed.push({ row_number: check.row_number, name: rows[i]?.name, error: check.error });
      continue;
    }

    await pool.query(
      'INSERT INTO medical_procedures (name, price) VALUES ($1, $2)',
      [check.data.name, check.data.price]
    );
    imported += 1;
  }

  res.json({ data: { imported, failed } });
}

export default { list, create, update, importPreview, importCommit };

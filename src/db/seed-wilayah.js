import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../config/db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const csvPath = path.join(__dirname, 'data', 'wilayah.csv');
const kodeposCsvPath = path.join(__dirname, 'data', 'wilayah_kodepos.csv');

// Minimal RFC4180 line parser — only two rows in the dataset actually need
// it (region names containing a comma, e.g. "Lambang Sari I, II, III"),
// everything else is a plain 4-column line.
function parseCsvLine(line) {
  const fields = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        current += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      fields.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  fields.push(current);
  return fields;
}

// One-off script that (re)seeds the `wilayah` reference table from the
// bundled CSVs (see migrations 010_add_wilayah.sql / 011_add_wilayah_kodepos.sql
// for the schema/source). Safe to re-run — truncates and reloads rather than
// upserting one by one.
async function seedWilayah() {
  const kodeposByKode = new Map();
  for (const line of fs.readFileSync(kodeposCsvPath, 'utf-8').split(/\r?\n/).filter(Boolean)) {
    const [kode, kodepos] = line.split(',');
    kodeposByKode.set(kode, kodepos);
  }

  const lines = fs.readFileSync(csvPath, 'utf-8').split(/\r?\n/).filter(Boolean);

  const kodes = [];
  const namas = [];
  const levels = [];
  const parentKodes = [];
  const kodePosList = [];

  for (const line of lines) {
    const [kode, nama, level, parentKode] = parseCsvLine(line);
    kodes.push(kode);
    namas.push(nama);
    levels.push(Number(level));
    parentKodes.push(parentKode || null);
    kodePosList.push(kodeposByKode.get(kode) || null);
  }

  console.log(`Seeding ${kodes.length} wilayah rows...`);

  await pool.query('TRUNCATE TABLE wilayah');

  const BATCH_SIZE = 5000;
  for (let i = 0; i < kodes.length; i += BATCH_SIZE) {
    await pool.query(
      `INSERT INTO wilayah (kode, nama, level, parent_kode, kode_pos)
       SELECT * FROM unnest($1::text[], $2::text[], $3::smallint[], $4::text[], $5::text[])`,
      [
        kodes.slice(i, i + BATCH_SIZE),
        namas.slice(i, i + BATCH_SIZE),
        levels.slice(i, i + BATCH_SIZE),
        parentKodes.slice(i, i + BATCH_SIZE),
        kodePosList.slice(i, i + BATCH_SIZE),
      ]
    );
    console.log(`  ...${Math.min(i + BATCH_SIZE, kodes.length)}/${kodes.length}`);
  }

  console.log('Wilayah seed complete.');
  await pool.end();
}

seedWilayah().catch((err) => {
  console.error('Failed to seed wilayah:', err);
  process.exit(1);
});

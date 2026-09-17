import { readFileSync, existsSync, unlinkSync } from 'fs';
import pool from '../config/db.js';

// Removes exactly the rows created by seed-today-screenshot-data.mjs, using
// the manifest of ids it wrote — never touches any other patient/appointment
// row, seeded or real.
//
// Run: node src/db/cleanup-seed-screenshot-data.mjs

const manifestUrl = new URL('./seed-today-screenshot-data.manifest.json', import.meta.url);

async function main() {
  if (!existsSync(manifestUrl)) {
    throw new Error(`Manifest not found at ${manifestUrl.pathname} — nothing to clean up (already removed?).`);
  }

  const manifest = JSON.parse(readFileSync(manifestUrl, 'utf-8'));
  const { patientIds = [], appointmentIds = [] } = manifest;

  if (appointmentIds.length > 0) {
    const { rowCount } = await pool.query(`DELETE FROM appointments WHERE id = ANY($1::uuid[])`, [appointmentIds]);
    console.log(`Deleted ${rowCount} appointment(s).`);
  }

  if (patientIds.length > 0) {
    const { rowCount } = await pool.query(`DELETE FROM patients WHERE id = ANY($1::uuid[])`, [patientIds]);
    console.log(`Deleted ${rowCount} patient(s).`);
  }

  unlinkSync(manifestUrl);
  console.log('Manifest removed. Cleanup complete.');

  await pool.end();
}

main().catch((err) => {
  console.error('Failed to clean up seeded screenshot data:', err);
  process.exit(1);
});

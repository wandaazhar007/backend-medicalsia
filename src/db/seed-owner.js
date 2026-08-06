import admin from '../config/firebase.js';
import pool from '../config/db.js';

// One-off script to provision the first owner account for this clinic
// deployment (Fase 0 SOP — manual, not a self-service flow).
async function seedOwner() {
  const email = process.argv[2];
  const fullName = process.argv[3] || 'Owner';

  if (!email) {
    console.error('Usage: node src/db/seed-owner.js <email> [full_name]');
    process.exit(1);
  }

  const firebaseUser = await admin.auth().getUserByEmail(email);

  const { rows } = await pool.query(
    `INSERT INTO users (firebase_uid, full_name, role)
     VALUES ($1, $2, 'owner')
     ON CONFLICT (firebase_uid) DO UPDATE SET full_name = EXCLUDED.full_name
     RETURNING id, firebase_uid, full_name, role, is_active`,
    [firebaseUser.uid, fullName]
  );

  console.log('Owner provisioned:', rows[0]);
  await pool.end();
}

seedOwner().catch((err) => {
  console.error('Failed to seed owner:', err);
  process.exit(1);
});

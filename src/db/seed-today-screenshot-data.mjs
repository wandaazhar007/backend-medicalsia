import { writeFileSync } from 'fs';
import pool from '../config/db.js';

// One-off script: seeds 20 patients + 20 today's appointments (varied status)
// so the landing page screenshot gallery has realistic-looking data.
// Reuses existing doctors already in the DB — does NOT create new doctors.
// Every inserted row's id is written to a manifest JSON so
// cleanup-seed-screenshot-data.mjs can remove exactly these rows later,
// without touching any real/pre-existing data.
//
// Run:   node src/db/seed-today-screenshot-data.mjs
// Undo:  node src/db/cleanup-seed-screenshot-data.mjs

const patients = [
  { fullName: 'Rangga Permadi', nik: '3171018804990011', dob: '1999-04-08', phone: '081298765011', email: 'rangga.permadi@example.com', address: 'Jl. Cempaka No. 3', village: 'Rawasari', district: 'Cempaka Putih', city: 'Jakarta Pusat', province: 'DKI Jakarta', postalCode: '10570', allergies: 'Tidak ada' },
  { fullName: 'Nadia Kirana', nik: '3171022506930012', dob: '1993-06-25', phone: '081298765012', email: 'nadia.kirana@example.com', address: 'Jl. Pramuka No. 21', village: 'Utan Kayu', district: 'Matraman', city: 'Jakarta Timur', province: 'DKI Jakarta', postalCode: '13120', allergies: 'Alergi Debu' },
  { fullName: 'Yusuf Maulana', nik: '3273031209870013', dob: '1987-09-12', phone: '081298765013', email: 'yusuf.maulana@example.com', address: 'Jl. Riau No. 60', village: 'Citarum', district: 'Bandung Wetan', city: 'Bandung', province: 'Jawa Barat', postalCode: '40115', allergies: 'Tidak ada' },
  { fullName: 'Clara Wulandari', nik: '3273044502950014', dob: '1995-02-05', phone: '081298765014', email: 'clara.wulandari@example.com', address: 'Jl. Setiabudi No. 88', village: 'Ledeng', district: 'Cidadap', city: 'Bandung', province: 'Jawa Barat', postalCode: '40143', allergies: 'Alergi Seafood' },
  { fullName: 'Doni Firmansyah', nik: '3578012811890015', dob: '1989-11-28', phone: '081298765015', email: 'doni.firmansyah@example.com', address: 'Jl. Kertajaya Indah No. 5', village: 'Mojo', district: 'Gubeng', city: 'Surabaya', province: 'Jawa Timur', postalCode: '60285', allergies: 'Tidak ada' },
  { fullName: 'Ratna Puspitasari', nik: '3578025107920016', dob: '1992-07-11', phone: '081298765016', email: 'ratna.puspitasari@example.com', address: 'Jl. Manyar No. 40', village: 'Manyar Sabrangan', district: 'Mulyorejo', city: 'Surabaya', province: 'Jawa Timur', postalCode: '60116', allergies: 'Alergi Penisilin' },
  { fullName: 'Bayu Aditya', nik: '3374011503910017', dob: '1991-03-15', phone: '081298765017', email: 'bayu.aditya@example.com', address: 'Jl. Gajah Mada No. 17', village: 'Gabahan', district: 'Semarang Tengah', city: 'Semarang', province: 'Jawa Tengah', postalCode: '50134', allergies: 'Tidak ada' },
  { fullName: 'Salsabila Putri', nik: '3374022009940018', dob: '1994-09-20', phone: '081298765018', email: 'salsabila.putri@example.com', address: 'Jl. Sriwijaya No. 29', village: 'Wonotingal', district: 'Candisari', city: 'Semarang', province: 'Jawa Tengah', postalCode: '50252', allergies: 'Alergi Kacang' },
  { fullName: 'Reza Firmanda', nik: '3404011106880019', dob: '1988-06-11', phone: '081298765019', email: 'reza.firmanda@example.com', address: 'Jl. Malioboro No. 50', village: 'Sosromenduran', district: 'Gedong Tengen', city: 'Yogyakarta', province: 'DI Yogyakarta', postalCode: '55271', allergies: 'Tidak ada' },
  { fullName: 'Intan Permatasari', nik: '3404022310960020', dob: '1996-10-23', phone: '081298765020', email: 'intan.permatasari@example.com', address: 'Jl. Kaliurang No. 12', village: 'Sinduadi', district: 'Mlati', city: 'Sleman', province: 'DI Yogyakarta', postalCode: '55284', allergies: 'Alergi Udang' },
  { fullName: 'Fadli Ramadhan', nik: '1271011407890021', dob: '1989-07-14', phone: '081298765021', email: 'fadli.ramadhan@example.com', address: 'Jl. Sisingamangaraja No. 8', village: 'Teladan Barat', district: 'Medan Kota', city: 'Medan', province: 'Sumatera Utara', postalCode: '20217', allergies: 'Tidak ada' },
  { fullName: 'Melati Anjani', nik: '1271022802930022', dob: '1993-02-28', phone: '081298765022', email: 'melati.anjani@example.com', address: 'Jl. Gatot Subroto No. 33', village: 'Sei Sikambing', district: 'Medan Sunggal', city: 'Medan', province: 'Sumatera Utara', postalCode: '20122', allergies: 'Alergi Debu' },
  { fullName: 'Arya Wicaksono', nik: '7371011905870023', dob: '1987-05-19', phone: '081298765023', email: 'arya.wicaksono@example.com', address: 'Jl. Sultan Alauddin No. 66', village: 'Mangasa', district: 'Tamalate', city: 'Makassar', province: 'Sulawesi Selatan', postalCode: '90224', allergies: 'Tidak ada' },
  { fullName: 'Citra Ayu Lestari', nik: '7371022107910024', dob: '1991-07-21', phone: '081298765024', email: 'citra.ayulestari@example.com', address: 'Jl. Pengayoman No. 14', village: 'Masale', district: 'Panakkukang', city: 'Makassar', province: 'Sulawesi Selatan', postalCode: '90231', allergies: 'Alergi Seafood' },
  { fullName: 'Hendra Gunawan', nik: '5171011203860025', dob: '1986-03-12', phone: '081298765025', email: 'hendra.gunawan@example.com', address: 'Jl. Gatot Subroto No. 9', village: 'Dauh Puri', district: 'Denpasar Barat', city: 'Denpasar', province: 'Bali', postalCode: '80113', allergies: 'Tidak ada' },
  { fullName: 'Ayu Kartika', nik: '5171022608990026', dob: '1999-08-26', phone: '081298765026', email: 'ayu.kartika@example.com', address: 'Jl. Diponegoro No. 25', village: 'Renon', district: 'Denpasar Timur', city: 'Denpasar', province: 'Bali', postalCode: '80235', allergies: 'Alergi Penisilin' },
  { fullName: 'Wahyu Nugraha', nik: '3171018011880027', dob: '1988-11-08', phone: '081298765027', email: 'wahyu.nugraha@example.com', address: 'Jl. Kemang Raya No. 40', village: 'Bangka', district: 'Mampang Prapatan', city: 'Jakarta Selatan', province: 'DKI Jakarta', postalCode: '12730', allergies: 'Tidak ada' },
  { fullName: 'Larasati Dewi', nik: '3171021404940028', dob: '1994-04-14', phone: '081298765028', email: 'larasati.dewi@example.com', address: 'Jl. Fatmawati No. 77', village: 'Cipete Selatan', district: 'Cilandak', city: 'Jakarta Selatan', province: 'DKI Jakarta', postalCode: '12410', allergies: 'Alergi Kacang' },
  { fullName: 'Galih Pratama', nik: '3273012909890029', dob: '1989-09-29', phone: '081298765029', email: 'galih.pratama@example.com', address: 'Jl. Buah Batu No. 55', village: 'Turangga', district: 'Lengkong', city: 'Bandung', province: 'Jawa Barat', postalCode: '40264', allergies: 'Tidak ada' },
  { fullName: 'Putri Amelia', nik: '3273021207920030', dob: '1992-07-12', phone: '081298765030', email: 'putri.amelia@example.com', address: 'Jl. Cihampelas No. 18', village: 'Cipaganti', district: 'Coblong', city: 'Bandung', province: 'Jawa Barat', postalCode: '40131', allergies: 'Alergi Udang' },
];

// 20 appointments spread across today's business hours, mixed statuses so
// the dashboard/antrian/kasir screenshots all show something meaningful:
// completed -> feeds the cashier's "selesai konsultasi" list, in_consultation
// -> shows an active queue, checked_in -> waiting room, booked -> upcoming.
const appointmentPlan = [
  { time: [8, 0], status: 'completed' },
  { time: [8, 15], status: 'completed' },
  { time: [8, 30], status: 'completed' },
  { time: [8, 45], status: 'completed' },
  { time: [9, 0], status: 'completed' },
  { time: [9, 15], status: 'completed' },
  { time: [9, 30], status: 'completed' },
  { time: [9, 45], status: 'completed' },
  { time: [10, 0], status: 'in_consultation' },
  { time: [10, 15], status: 'in_consultation' },
  { time: [10, 30], status: 'in_consultation' },
  { time: [10, 45], status: 'checked_in' },
  { time: [11, 0], status: 'checked_in' },
  { time: [11, 15], status: 'checked_in' },
  { time: [11, 30], status: 'checked_in' },
  { time: [13, 0], status: 'booked' },
  { time: [13, 30], status: 'booked' },
  { time: [14, 0], status: 'booked' },
  { time: [14, 30], status: 'booked' },
  { time: [15, 0], status: 'booked' },
];

async function main() {
  const { rows: doctorRows } = await pool.query(
    `SELECT id, full_name FROM users WHERE role = 'doctor' ORDER BY created_at`
  );
  if (doctorRows.length === 0) {
    throw new Error('No doctors found in this database — cannot assign appointments.');
  }

  // Build scheduled_at against the clinic's own calendar day (WIB, UTC+7),
  // not this script's machine timezone — a script run from outside Indonesia
  // would otherwise insert appointments dated "yesterday"/"tomorrow" relative
  // to what `scheduled_at::date = CURRENT_DATE` resolves to in the DB.
  const { rows: todayRows } = await pool.query(
    `SELECT to_char((now() AT TIME ZONE 'Asia/Jakarta')::date, 'YYYY-MM-DD') AS jakarta_today`
  );
  const jakartaToday = todayRows[0].jakarta_today;

  const patientIds = [];
  for (const patient of patients) {
    const { rows } = await pool.query(
      `INSERT INTO patients (full_name, nik, dob, phone, email, address, village, district, city, province, postal_code, allergies)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING id, patient_number, full_name`,
      [
        patient.fullName, patient.nik, patient.dob, patient.phone, patient.email,
        patient.address, patient.village, patient.district, patient.city,
        patient.province, patient.postalCode, patient.allergies,
      ]
    );
    patientIds.push(rows[0].id);
    console.log(`Patient created: ${rows[0].patient_number} - ${rows[0].full_name}`);
  }

  const appointmentIds = [];
  let queueCounter = 1;

  for (let i = 0; i < appointmentPlan.length; i += 1) {
    const { time, status } = appointmentPlan[i];
    const doctor = doctorRows[i % doctorRows.length];
    const hh = String(time[0]).padStart(2, '0');
    const mm = String(time[1]).padStart(2, '0');
    // Explicit +07:00 (WIB) offset — parsed correctly regardless of the
    // machine timezone this script happens to run on.
    const scheduledAt = new Date(`${jakartaToday}T${hh}:${mm}:00+07:00`);

    const hasQueueNumber = status !== 'booked';
    const queueNumber = hasQueueNumber ? `A${queueCounter}` : null;
    if (hasQueueNumber) queueCounter += 1;

    const { rows } = await pool.query(
      `INSERT INTO appointments (patient_id, doctor_id, scheduled_at, queue_number, status, booked_via)
       VALUES ($1, $2, $3, $4, $5, 'staff')
       RETURNING id`,
      [patientIds[i], doctor.id, scheduledAt.toISOString(), queueNumber, status]
    );
    appointmentIds.push(rows[0].id);
    console.log(
      `Appointment created: ${patients[i].fullName} with ${doctor.full_name} at ${time[0]}:${String(time[1]).padStart(2, '0')} — ${status}${queueNumber ? ` (${queueNumber})` : ''}`
    );
  }

  const manifest = {
    seededAt: new Date().toISOString(),
    patientIds,
    appointmentIds,
  };
  const manifestPath = new URL('./seed-today-screenshot-data.manifest.json', import.meta.url);
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

  console.log(`\nSeed complete: ${patientIds.length} patients, ${appointmentIds.length} appointments.`);
  console.log(`Manifest written to ${manifestPath.pathname}`);
  console.log('Run "node src/db/cleanup-seed-screenshot-data.mjs" later to remove exactly this seeded data.');

  await pool.end();
}

main().catch((err) => {
  console.error('Failed to seed screenshot demo data:', err);
  process.exit(1);
});

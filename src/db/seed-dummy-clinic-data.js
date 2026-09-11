import pool from '../config/db.js';

// One-off script to seed dummy clinic data for testing/demo purposes:
// 7 doctors (synthetic firebase_uid, not real Firebase accounts), 10 patients,
// one weekly schedule per doctor, and 10 appointments booked for today.
// Not wired into package.json — run manually with:
//   node src/db/seed-dummy-clinic-data.js

const doctors = [
  { fullName: 'dr. Andi Wijaya', phone: '081234500001', email: 'dr.andi.wijaya@medicalsia-seed.local' },
  { fullName: 'dr. Siti Rahmawati', phone: '081234500002', email: 'dr.siti.rahmawati@medicalsia-seed.local' },
  { fullName: 'dr. Budi Santoso', phone: '081234500003', email: 'dr.budi.santoso@medicalsia-seed.local' },
  { fullName: 'dr. Rina Kusuma', phone: '081234500004', email: 'dr.rina.kusuma@medicalsia-seed.local' },
  { fullName: 'dr. Hendra Pratama', phone: '081234500005', email: 'dr.hendra.pratama@medicalsia-seed.local' },
  { fullName: 'dr. Maya Sari', phone: '081234500006', email: 'dr.maya.sari@medicalsia-seed.local' },
  { fullName: 'dr. Fajar Nugroho', phone: '081234500007', email: 'dr.fajar.nugroho@medicalsia-seed.local' },
];

const patients = [
  {
    fullName: 'Ahmad Fauzi', nik: '3171012501900001', dob: '1990-01-25', phone: '081298765001',
    email: 'ahmad.fauzi@example.com', address: 'Jl. Melati No. 12', village: 'Menteng',
    district: 'Menteng', city: 'Jakarta Pusat', province: 'DKI Jakarta', postalCode: '10310',
    allergies: 'Tidak ada',
  },
  {
    fullName: 'Siti Nurhaliza', nik: '3171034503920002', dob: '1992-03-05', phone: '081298765002',
    email: 'siti.nurhaliza@example.com', address: 'Jl. Kenanga No. 8', village: 'Cempaka Putih Timur',
    district: 'Cempaka Putih', city: 'Jakarta Pusat', province: 'DKI Jakarta', postalCode: '10510',
    allergies: 'Alergi Penisilin',
  },
  {
    fullName: 'Budi Setiawan', nik: '3273011207880003', dob: '1988-07-12', phone: '081298765003',
    email: 'budi.setiawan@example.com', address: 'Jl. Sukajadi No. 45', village: 'Sukajadi',
    district: 'Sukajadi', city: 'Bandung', province: 'Jawa Barat', postalCode: '40161',
    allergies: 'Tidak ada',
  },
  {
    fullName: 'Dewi Lestari', nik: '3273042909950004', dob: '1995-09-29', phone: '081298765004',
    email: 'dewi.lestari@example.com', address: 'Jl. Dago No. 100', village: 'Dago',
    district: 'Coblong', city: 'Bandung', province: 'Jawa Barat', postalCode: '40135',
    allergies: 'Alergi Seafood',
  },
  {
    fullName: 'Eko Prasetyo', nik: '3578011503870005', dob: '1987-03-15', phone: '081298765005',
    email: 'eko.prasetyo@example.com', address: 'Jl. Diponegoro No. 21', village: 'Darmo',
    district: 'Wonokromo', city: 'Surabaya', province: 'Jawa Timur', postalCode: '60241',
    allergies: 'Tidak ada',
  },
  {
    fullName: 'Fitriani Rahayu', nik: '3578022108930006', dob: '1993-08-21', phone: '081298765006',
    email: 'fitriani.rahayu@example.com', address: 'Jl. Kertajaya No. 55', village: 'Gubeng',
    district: 'Gubeng', city: 'Surabaya', province: 'Jawa Timur', postalCode: '60286',
    allergies: 'Alergi Debu',
  },
  {
    fullName: 'Gunawan Saputra', nik: '3204011811890007', dob: '1989-11-18', phone: '081298765007',
    email: 'gunawan.saputra@example.com', address: 'Jl. Ahmad Yani No. 33', village: 'Cihapit',
    district: 'Bandung Wetan', city: 'Bandung', province: 'Jawa Barat', postalCode: '40114',
    allergies: 'Tidak ada',
  },
  {
    fullName: 'Hana Puspita', nik: '3171056004910008', dob: '1991-04-20', phone: '081298765008',
    email: 'hana.puspita@example.com', address: 'Jl. Sudirman No. 77', village: 'Karet Tengsin',
    district: 'Tanah Abang', city: 'Jakarta Pusat', province: 'DKI Jakarta', postalCode: '10250',
    allergies: 'Alergi Kacang',
  },
  {
    fullName: 'Irwan Setiadi', nik: '3374012609860009', dob: '1986-09-26', phone: '081298765009',
    email: 'irwan.setiadi@example.com', address: 'Jl. Pahlawan No. 9', village: 'Sekayu',
    district: 'Semarang Tengah', city: 'Semarang', province: 'Jawa Tengah', postalCode: '50131',
    allergies: 'Tidak ada',
  },
  {
    fullName: 'Julia Anggraini', nik: '3374023112940010', dob: '1994-12-31', phone: '081298765010',
    email: 'julia.anggraini@example.com', address: 'Jl. Pandanaran No. 14', village: 'Pekunden',
    district: 'Semarang Tengah', city: 'Semarang', province: 'Jawa Tengah', postalCode: '50132',
    allergies: 'Alergi Udang',
  },
];

async function seedDummyClinicData() {
  const doctorIds = [];
  for (let i = 0; i < doctors.length; i += 1) {
    const doctor = doctors[i];
    const { rows } = await pool.query(
      `INSERT INTO users (firebase_uid, full_name, phone, role)
       VALUES ($1, $2, $3, 'doctor')
       RETURNING id, full_name`,
      [`seed-doctor-${i + 1}`, doctor.fullName, doctor.phone]
    );
    doctorIds.push(rows[0].id);
    console.log(`Doctor created: ${rows[0].full_name} (${doctor.email})`);
  }

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

  const scheduleTimes = [
    { start: '08:00', end: '12:00' },
    { start: '13:00', end: '17:00' },
  ];
  for (let i = 0; i < doctorIds.length; i += 1) {
    const dayOfWeek = i % 7;
    const times = scheduleTimes[i % scheduleTimes.length];
    await pool.query(
      `INSERT INTO doctor_schedules (doctor_id, day_of_week, start_time, end_time)
       VALUES ($1, $2, $3, $4)`,
      [doctorIds[i], dayOfWeek, times.start, times.end]
    );
    console.log(`Schedule created: doctor ${i + 1} - day ${dayOfWeek} (${times.start}-${times.end})`);
  }

  const today = new Date();
  const appointmentHours = [
    [8, 0], [8, 30], [9, 0], [9, 30], [10, 0],
    [10, 30], [11, 0], [13, 0], [13, 30], [14, 0],
  ];
  for (let i = 0; i < patientIds.length; i += 1) {
    const doctorId = doctorIds[i % doctorIds.length];
    const [hour, minute] = appointmentHours[i];
    const scheduledAt = new Date(today);
    scheduledAt.setHours(hour, minute, 0, 0);

    await pool.query(
      `INSERT INTO appointments (patient_id, doctor_id, scheduled_at, booked_via)
       VALUES ($1, $2, $3, 'staff')`,
      [patientIds[i], doctorId, scheduledAt.toISOString()]
    );
    console.log(`Appointment created: patient ${i + 1} with doctor ${(i % doctorIds.length) + 1} at ${scheduledAt.toISOString()}`);
  }

  console.log('\nSeed complete: 7 doctors, 10 patients, 7 schedules, 10 appointments.');
  await pool.end();
}

seedDummyClinicData().catch((err) => {
  console.error('Failed to seed dummy clinic data:', err);
  process.exit(1);
});

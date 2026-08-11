import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import AuthRoutes from './src/routes/AuthRoutes.js';
import ClinicProfileRoutes from './src/routes/ClinicProfileRoutes.js';
import UserRoutes from './src/routes/UserRoutes.js';
import ServiceRoutes from './src/routes/ServiceRoutes.js';
import PatientRoutes from './src/routes/PatientRoutes.js';
import DoctorScheduleRoutes from './src/routes/DoctorScheduleRoutes.js';
import AppointmentRoutes from './src/routes/AppointmentRoutes.js';
import QueueCallRoutes from './src/routes/QueueCallRoutes.js';
import PublicRoutes from './src/routes/PublicRoutes.js';
import MedicineRoutes from './src/routes/MedicineRoutes.js';
import MedicalRecordRoutes from './src/routes/MedicalRecordRoutes.js';
import PrescriptionRoutes from './src/routes/PrescriptionRoutes.js';
import InvoiceRoutes from './src/routes/InvoiceRoutes.js';
import ShortfallRoutes from './src/routes/ShortfallRoutes.js';
import PharmacyRoutes from './src/routes/PharmacyRoutes.js';
import DashboardRoutes from './src/routes/DashboardRoutes.js';
import WilayahRoutes from './src/routes/WilayahRoutes.js';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/auth', AuthRoutes);
app.use('/api/clinic-profile', ClinicProfileRoutes);
app.use('/api/users', UserRoutes);
app.use('/api/services', ServiceRoutes);
app.use('/api/patients', PatientRoutes);
app.use('/api/doctor-schedules', DoctorScheduleRoutes);
app.use('/api/appointments', AppointmentRoutes);
app.use('/api/queue-calls', QueueCallRoutes);
app.use('/api/public', PublicRoutes);
app.use('/api/medicines', MedicineRoutes);
app.use('/api/medical-records', MedicalRecordRoutes);
app.use('/api/prescriptions', PrescriptionRoutes);
app.use('/api/invoices', InvoiceRoutes);
app.use('/api/shortfalls', ShortfallRoutes);
app.use('/api/pharmacy', PharmacyRoutes);
app.use('/api/dashboard', DashboardRoutes);
app.use('/api/wilayah', WilayahRoutes);

// Fallback error handler — keeps unexpected errors in the standard error shape.
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' } });
});

const PORT = process.env.PORT || 5017;
app.listen(PORT, () => {
  console.log(`backend-medicalsia running on port ${PORT}`);
});

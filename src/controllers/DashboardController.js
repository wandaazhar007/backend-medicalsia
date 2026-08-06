import pool from '../config/db.js';

// All appointment statuses from the enum reference (02-data-model.md), used
// so the response always has every key present even when a status has zero
// rows today, instead of leaving frontend to guess at defaults.
const APPOINTMENT_STATUSES = ['booked', 'checked_in', 'in_consultation', 'completed', 'cancelled', 'no_show'];

// GET /dashboard/owner-stats — aggregate counts/sums for the owner dashboard.
// Every query here is intentionally a plain COUNT/SUM, not a paginated list —
// this endpoint is a summary, not a resource collection.
async function getOwnerStats(req, res) {
  const [
    appointmentsTodayResult,
    revenueTodayResult,
    invoicesUnpaidResult,
    doctorQueueResult,
    pharmacyQueueResult,
    refundsPendingResult,
    medicinesLowStockResult,
    medicinesLowStockCountResult,
    patientsTotalResult,
    staffActiveResult,
  ] = await Promise.all([
    pool.query(
      `SELECT status, COUNT(*)::int AS count FROM appointments
       WHERE scheduled_at::date = CURRENT_DATE GROUP BY status`
    ),
    pool.query(
      `SELECT COALESCE(SUM(total_amount), 0)::numeric AS total FROM invoices
       WHERE status = 'paid' AND paid_at::date = CURRENT_DATE`
    ),
    pool.query(`SELECT COUNT(*)::int AS count FROM invoices WHERE status = 'unpaid'`),
    pool.query(
      `SELECT COUNT(*)::int AS count FROM appointments
       WHERE status IN ('checked_in', 'in_consultation') AND scheduled_at::date = CURRENT_DATE`
    ),
    // Same filter as PharmacyController.getQueue, so this number always
    // matches what pharmacy staff actually see in their queue.
    pool.query(`SELECT COUNT(*)::int AS count FROM prescriptions WHERE status = 'paid'`),
    pool.query(
      `SELECT COUNT(*)::int AS count, COALESCE(SUM(refund_amount), 0)::numeric AS total
       FROM prescription_shortfalls WHERE refund_status = 'pending'`
    ),
    pool.query(
      `SELECT id, name, stock_qty, min_stock_alert FROM medicines
       WHERE is_active = true AND stock_qty <= min_stock_alert
       ORDER BY stock_qty ASC LIMIT 10`
    ),
    pool.query(
      `SELECT COUNT(*)::int AS count FROM medicines
       WHERE is_active = true AND stock_qty <= min_stock_alert`
    ),
    pool.query(`SELECT COUNT(*)::int AS count FROM patients`),
    pool.query(`SELECT COUNT(*)::int AS count FROM users WHERE is_active = true`),
  ]);

  res.json({
    data: {
      appointments_today: reduceAppointmentsByStatus(appointmentsTodayResult.rows),
      revenue_today: Number(revenueTodayResult.rows[0].total),
      invoices_unpaid_count: invoicesUnpaidResult.rows[0].count,
      queue_active: {
        doctor_count: doctorQueueResult.rows[0].count,
        pharmacy_count: pharmacyQueueResult.rows[0].count,
      },
      refunds_pending: {
        count: refundsPendingResult.rows[0].count,
        total_amount: Number(refundsPendingResult.rows[0].total),
      },
      medicines_low_stock: {
        count: medicinesLowStockCountResult.rows[0].count,
        items: medicinesLowStockResult.rows,
      },
      patients_total: patientsTotalResult.rows[0].count,
      staff_active_count: staffActiveResult.rows[0].count,
    },
  });
}

function reduceAppointmentsByStatus(rows) {
  const appointmentsByStatus = APPOINTMENT_STATUSES.reduce((acc, status) => {
    acc[status] = 0;
    return acc;
  }, {});
  let total = 0;
  for (const row of rows) {
    appointmentsByStatus[row.status] = row.count;
    total += row.count;
  }
  appointmentsByStatus.total = total;
  return appointmentsByStatus;
}

// GET /dashboard/doctor-stats — today's schedule for the logged-in doctor
// only (req.user.id), not clinic-wide financials/staff — a doctor's daily
// view is their own queue, not the owner's operational summary.
async function getDoctorStats(req, res) {
  const doctorId = req.user.id;

  const [appointmentsTodayResult, nextPatientsResult] = await Promise.all([
    pool.query(
      `SELECT status, COUNT(*)::int AS count FROM appointments
       WHERE doctor_id = $1 AND scheduled_at::date = CURRENT_DATE GROUP BY status`,
      [doctorId]
    ),
    pool.query(
      `SELECT a.id, a.queue_number, a.scheduled_at, p.full_name AS patient_name
       FROM appointments a
       JOIN patients p ON p.id = a.patient_id
       WHERE a.doctor_id = $1 AND a.status = 'checked_in' AND a.scheduled_at::date = CURRENT_DATE
       ORDER BY a.queue_number ASC LIMIT 10`,
      [doctorId]
    ),
  ]);

  res.json({
    data: {
      appointments_today: reduceAppointmentsByStatus(appointmentsTodayResult.rows),
      next_patients: nextPatientsResult.rows,
    },
  });
}

// GET /dashboard/pharmacy-stats — dispensing queue + stock health for the
// pharmacy role. Same 'paid' filter as PharmacyController.getQueue, so the
// count always matches what pharmacy actually sees in their queue.
async function getPharmacyStats(req, res) {
  const [queueResult, completedTodayResult, medicinesLowStockResult, medicinesLowStockCountResult] = await Promise.all([
    pool.query(`SELECT COUNT(*)::int AS count FROM prescriptions WHERE status = 'paid'`),
    pool.query(
      `SELECT COUNT(*)::int AS count FROM prescriptions
       WHERE status = 'completed' AND completed_at::date = CURRENT_DATE`
    ),
    pool.query(
      `SELECT id, name, stock_qty, min_stock_alert FROM medicines
       WHERE is_active = true AND stock_qty <= min_stock_alert
       ORDER BY stock_qty ASC LIMIT 10`
    ),
    pool.query(
      `SELECT COUNT(*)::int AS count FROM medicines
       WHERE is_active = true AND stock_qty <= min_stock_alert`
    ),
  ]);

  res.json({
    data: {
      queue_count: queueResult.rows[0].count,
      completed_today_count: completedTodayResult.rows[0].count,
      medicines_low_stock: {
        count: medicinesLowStockCountResult.rows[0].count,
        items: medicinesLowStockResult.rows,
      },
    },
  });
}

export default { getOwnerStats, getDoctorStats, getPharmacyStats };

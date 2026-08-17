import multer from 'multer';

// Browsers send inconsistent mimetypes for CSV (text/csv, application/vnd.ms-excel,
// or even empty) — checking the extension too avoids false rejections.
const IMPORT_MIMETYPES = [
  'text/csv',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

const importUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const hasValidExtension = /\.(csv|xlsx|xls)$/i.test(file.originalname);
    if (!IMPORT_MIMETYPES.includes(file.mimetype) && !hasValidExtension) {
      return cb(new Error('Only CSV or Excel files are allowed'));
    }
    cb(null, true);
  },
});

// Shared by every bulk-import route (medicines, medical procedures, ...).
export function uploadImportFile(req, res, next) {
  importUpload.single('file')(req, res, (err) => {
    if (err) return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: err.message } });
    next();
  });
}

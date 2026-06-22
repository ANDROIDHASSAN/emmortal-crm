import multer from 'multer';

// In-memory file upload (CSV/XML/dat) — files are parsed then discarded, never written to disk.
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

export default upload;

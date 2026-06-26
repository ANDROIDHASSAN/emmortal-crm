import multer from 'multer';

// In-memory upload for CSV / Tally / eSSL files — parsed then discarded.
export const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

export default upload;

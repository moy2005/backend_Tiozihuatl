import multer from 'multer';

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp'
  ];

  if (!allowedTypes.includes(file.mimetype)) {
    return cb(new Error('Tipo de archivo no permitido'), false);
  }

  cb(null, true);
};

// ✅ memoryStorage en lugar de diskStorage
export const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  }
});
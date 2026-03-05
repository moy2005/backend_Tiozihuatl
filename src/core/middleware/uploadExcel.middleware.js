import multer from "multer";
import path from "path";

const storage = multer.memoryStorage();

export const uploadExcel = multer({
  storage,
  fileFilter: (req, file, cb) => {

    const ext = path.extname(file.originalname).toLowerCase();

    const allowedMimeTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
      "application/octet-stream"
    ];

    if (ext !== ".xlsx") {
      return cb(new Error("Solo se permiten archivos .xlsx"));
    }

    if (!allowedMimeTypes.includes(file.mimetype)) {
      return cb(new Error("Tipo de archivo no permitido"));
    }

    return cb(null, true);
  },
  limits: {
    fileSize: 50 * 1024 * 1024, // 5MB
  },
});
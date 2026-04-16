import multer from "multer";

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {

  const allowed = [

    // DOCUMENTOS
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",

    //  POWERPOINT
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",

    //  EXCEL
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",

    // IMÁGENES
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",

    //  VIDEO
    "video/mp4",
    "video/webm",
    "video/quicktime",

    //  COMPRIMIDOS 
    "application/zip",
    "application/x-zip-compressed",
    "application/x-rar-compressed",
    "application/x-7z-compressed"
    ];

  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Tipo no permitido: ${file.mimetype}`), false);
  }
};

export const uploadMaterial = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB
  }
});

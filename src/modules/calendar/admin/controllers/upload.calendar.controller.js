import multer from 'multer';
import storageService from '../services/storage.calendar.service.js';

// Guardamos archivo en memoria
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 } // 20MB
});

//  Middleware + controlador
const uploadCalendar = [
  upload.single('file'), // Debe coincidir con formData.append('file', ...)
  async (req, res) => {
    try {

      //  Verificar archivo
      if (!req.file) {
        return res.status(400).json({
          message: 'Archivo requerido'
        });
      }

      const { tipo_calendario } = req.body;

      // 🔎 Validar tipo
      if (!['ALUMNO', 'DOCENTE'].includes(tipo_calendario)) {
        return res.status(400).json({
          message: 'Tipo inválido'
        });
      }

      // Subir a Cloudinary (o servicio que uses)
      const result = await storageService.uploadCalendar(
        req.file.buffer,
        tipo_calendario
      );

      // IMPORTANTE:
      // Asegúrate que storageService devuelva { secure_url: "..." }
      return res.status(200).json(result);

    } catch (error) {
      console.error('❌ Error subirCalendario:', error);
      return res.status(500).json({
        message: 'Error al subir archivo'
      });
    }
  }
];

export default {
  uploadCalendar
};

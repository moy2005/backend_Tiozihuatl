import service from '../services/admin.catalog.service.js';
import storageService from '../services/storage.service.js';
import multer from 'multer';

// Configuración específica para PDFs (Opción B)
const pdfUpload = multer({
  storage: multer.memoryStorage(),
  limits: { 
    fileSize: 20 * 1024 * 1024 // 20MB para PDFs
  },
  fileFilter: (req, file, cb) => {
    // Solo permitir PDFs
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos PDF'), false);
    }
  }
});

/**
 * 📤 Subir PDF de libro
 * Ruta: POST /api/admin/catalog/upload-pdf
 */
const subirPdf = [
  pdfUpload.single('file'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ 
          success: false,
          message: 'Archivo requerido' 
        });
      }

      console.log('📄 Subiendo PDF:', {
        originalname: req.file.originalname,
        size: `${(req.file.size / 1024 / 1024).toFixed(2)}MB`,
        mimetype: req.file.mimetype
      });

      const result = await storageService.uploadPdf(req.file.buffer);

      res.status(201).json({
        success: true,
        message: 'PDF subido exitosamente',
        data: {
          public_id: result.public_id,
          secure_url: result.secure_url,
          format: result.format,
          size: result.bytes,
          created_at: result.created_at
        }
      });

    } catch (error) {
      console.error('❌ Error subirPdf:', error);
      
      // Manejar errores específicos de multer
      if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ 
            success: false,
            message: 'El archivo excede el límite de 10MB' 
          });
        }
      }
      
      // Manejar errores de Cloudinary
      if (error.http_code) {
        return res.status(400).json({ 
          success: false,
          message: `Error de Cloudinary: ${error.message}` 
        });
      }
      
      res.status(500).json({ 
        success: false,
        message: error.message || 'Error al subir PDF' 
      });
    }
  }
];

/**
 * ➕ Crear libro
 * Ruta: POST /api/admin/catalog
 */
const crearLibro = async (req, res) => {
  try {
    const { titulo, autor, editorial, categoria_id, url_pdf, total } = req.body;

    // Transformar al formato que espera el modelo
    const data = {
      titulo,
      autor,
      editorial,
      materias: categoria_id ? [categoria_id] : [],
      formatos: []
    };

    // Agregar formato físico si tiene stock
    if (total) {
      data.formatos.push({
        tipo: 'FISICO',
        total: total,
        disponibles: total
      });
    }

    // Agregar formato digital si tiene PDF
    if (url_pdf) {
      data.formatos.push({
        tipo: 'DIGITAL',
        pdf_url: url_pdf
      });
    }

    const id = await service.crearLibro(data);

    res.status(201).json({
      success: true,
      message: 'Libro creado exitosamente',
      data: { id }
    });

  } catch (err) {
    console.error('❌ Error crearLibro:', err);
    res.status(500).json({
      success: false,
      message: 'Error al crear libro'
    });
  }
};

/**
 * 📚 Listar libros (admin)
 * Ruta: GET /api/admin/catalog
 */
const listarLibros = async (req, res) => {
  try {
    const libros = await service.obtenerLibrosAdmin();
    
    res.json({
      success: true,
      data: libros
    });
  } catch (error) {
    console.error('❌ Error listarLibros:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error al obtener libros' 
    });
  }
};

/**
 * ✏️ Actualizar libro
 * Ruta: PUT /api/admin/catalog/:id
 */
const updateLibro = async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;
    
    if (!data || Object.keys(data).length === 0) {
      return res.status(400).json({ 
        success: false,
        message: 'Datos vacíos para actualizar' 
      });
    }

    await service.actualizarLibro(id, data);
    
    res.json({ 
      success: true,
      message: 'Libro actualizado correctamente' 
    });
  } catch (error) {
    console.error('❌ Error updateLibro:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error al actualizar libro' 
    });
  }
};

/**
 * 🔄 Activar / Desactivar libro
 * Ruta: PATCH /api/admin/catalog/:id/estado
 */
const cambiarEstado = async (req, res) => {
  try {
    const { id } = req.params;
    let { activo } = req.body;

    if (activo === undefined) {
      return res.status(400).json({ 
        success: false,
        message: 'Campo activo requerido' 
      });
    }

    // Normalizar a 1 o 0
    activo = Number(activo) === 1 ? 1 : 0;

    await service.cambiarEstado(id, activo);

    res.json({ 
      success: true,
      message: 'Estado actualizado correctamente',
      data: { activo }
    });

  } catch (error) {
    console.error('❌ Error cambiarEstado:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error al cambiar estado' 
    });
  }
};

export default {
  crearLibro,
  listarLibros,
  updateLibro,
  cambiarEstado,
  subirPdf
};
import service from '../services/admin.catalog.service.js';
import multer from 'multer';
import storageService from '../services/storage.service.js';

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB opcional
});

const subirPdf = [
  upload.single('file'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'Archivo requerido' });
      }

      const result = await storageService.uploadPdf(req.file.buffer);

      res.json(result);

    } catch (error) {
      console.error('❌ Error subirPdf:', error);
      res.status(500).json({ message: 'Error al subir PDF' });
    }
  }
];

/**  Crear libro */
const crearLibro = async (req, res) => {
  try {
    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({ message: 'Datos del libro requeridos' });
    }

    const id = await service.crearLibro(req.body);
    res.status(201).json({ message: 'Libro creado', id });
  } catch (err) {
    console.error('❌ Error crearLibro:', err);
    res.status(500).json({ message: 'Error al crear libro' });
  }
};

/** Listar libros (admin) */
const listarLibros = async (req, res) => {
  try {

    const { search, materia, formato, ordenAutor, activo, semestre } = req.query;

    const libros = await service.getCatalogAdmin({
      search,
      materia,
      formato,
      ordenAutor,
      activo,
      semestre
    });

    res.json(libros);

  } catch (error) {
    console.error('❌ Error listarLibros:', error);
    res.status(500).json({ message: 'Error al obtener libros' });
  }
};

/** Actualizar libro */
const updateLibro = async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;
    if(!data || Object.keys(data).length===0){
      return res.status(400).json({message: 'Datos vacíos para actualizar'})
    }
    await service.actualizarLibro(id, data);
    res.json({ message: 'Libro actualizado correctamente' });
  } catch (error) {
    console.error('❌ Error updateLibro:', error);
    res.status(500).json({ message: 'Error al actualizar libro' });
  }
};

/**  Activar / Desactivar */
const cambiarEstado = async (req, res) => {
  try {
    const { id } = req.params;
    let { activo } = req.body;

    if (activo === undefined) {
      return res.status(400).json({ message: 'Campo activo requerido' });
    }

    // Normalizar a 1 o 0
    activo = Number(activo) === 1 ? 1 : 0;

    await service.cambiarEstado(id, activo);

    res.json({ 
      message: 'Estado actualizado correctamente',
      activo
    });

  } catch (error) {
    console.error('❌ Error cambiarEstado:', error);
    res.status(500).json({ message: 'Error al cambiar estado' });
  }
};

const listarAutores = async (req, res) => {
  try {
    const autores = await service.obtenerAutores();
    res.json(autores);
  } catch (error) {
    console.error('❌ Error listarAutores:', error);
    res.status(500).json({ message: 'Error al obtener autores' });
  }
};

const getSemestres = async (req, res) => {
    try {
      const semestres = await service.obtenerSemestres();
      res.json(semestres);
    } catch (error) {
      console.error('❌ Error getSemestres:', error);
      res.status(500).json({ message: 'Error al obtener semestres' });
    }
}

const eliminarLibro = async (req, res) => {
  try {
    const { id } = req.params;
    await service.eliminarLibro(id);
    res.json({ message: 'Libro eliminado correctamente' });
  } catch (error) {
    console.error('❌ Error eliminarLibro:', error);
    res.status(500).json({ message: 'Error al eliminar el libro' });
  }
};

export default {
  crearLibro,
  listarLibros,
  updateLibro,
  cambiarEstado,
  subirPdf, 
  listarAutores,
  getSemestres,
  eliminarLibro
};

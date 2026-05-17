import service from '../services/admin.privacidad.service.js';

const listar = async (req, res) => {
  try {
    const { search, activo } = req.query;
    const secciones = await service.listar({ search, activo });
    res.json(secciones);
  } catch (e) {
    console.error('❌ listar politicas:', e);
    res.status(500).json({ message: 'Error al obtener secciones' });
  }
};

const crear = async (req, res) => {
  try {
    const { seccion_numero, titulo, contenido, icono, orden } = req.body;
    if (!titulo || !contenido) {
      return res.status(400).json({ message: 'Título y contenido son requeridos' });
    }
    const id = await service.crear({ seccion_numero, titulo, contenido, icono, orden });
    res.status(201).json({ message: 'Sección creada', id });
  } catch (e) {
    console.error('❌ crear politica:', e);
    res.status(500).json({ message: 'Error al crear sección' });
  }
};

const actualizar = async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;
    if (!data.titulo || !data.contenido) {
      return res.status(400).json({ message: 'Datos incompletos' });
    }
    await service.actualizar(id, data);
    res.json({ message: 'Sección actualizada' });
  } catch (e) {
    console.error('❌ actualizar politica:', e);
    res.status(500).json({ message: 'Error al actualizar sección' });
  }
};

const cambiarEstado = async (req, res) => {
  try {
    const { id } = req.params;
    const activo = Number(req.body.activo) === 1 ? 1 : 0;
    await service.cambiarEstado(id, activo);
    res.json({ message: 'Estado actualizado', activo });
  } catch (e) {
    console.error('❌ cambiarEstado politica:', e);
    res.status(500).json({ message: 'Error al cambiar estado' });
  }
};

const eliminar = async (req, res) => {
  try {
    const { id } = req.params;
    await service.eliminar(id);
    res.json({ message: 'Sección eliminada' });
  } catch (e) {
    console.error('❌ eliminar politica:', e);
    res.status(500).json({ message: 'Error al eliminar sección' });
  }
};

export default { listar, crear, actualizar, cambiarEstado, eliminar };
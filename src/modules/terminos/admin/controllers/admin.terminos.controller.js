import service from '../services/admin.terminos.service.js';

const listar = async (req, res) => {
  try {
    const secciones = await service.listar();
    res.json(secciones);
  } catch (err) {
    console.error('❌ listar terminos:', err);
    res.status(500).json({ message: 'Error al obtener secciones' });
  }
};

const obtener = async (req, res) => {
  try {
    const seccion = await service.obtener(req.params.id);
    if (!seccion) return res.status(404).json({ message: 'Sección no encontrada' });
    res.json(seccion);
  } catch (err) {
    console.error('❌ obtener termino:', err);
    res.status(500).json({ message: 'Error al obtener sección' });
  }
};

const crear = async (req, res) => {
  try {
    const { numero, titulo, subtitulo, contenido, orden } = req.body;
    if (!numero || !titulo || !contenido) {
      return res.status(400).json({ message: 'numero, titulo y contenido son requeridos' });
    }
    const id = await service.crear({ numero, titulo, subtitulo, contenido, orden });
    res.status(201).json({ message: 'Sección creada', id });
  } catch (err) {
    console.error('❌ crear termino:', err);
    res.status(500).json({ message: 'Error al crear sección' });
  }
};

const actualizar = async (req, res) => {
  try {
    const { numero, titulo, subtitulo, contenido, orden } = req.body;
    if (!numero || !titulo || !contenido) {
      return res.status(400).json({ message: 'numero, titulo y contenido son requeridos' });
    }
    await service.actualizar(req.params.id, { numero, titulo, subtitulo, contenido, orden });
    res.json({ message: 'Sección actualizada correctamente' });
  } catch (err) {
    console.error('❌ actualizar termino:', err);
    res.status(500).json({ message: 'Error al actualizar sección' });
  }
};

const cambiarEstado = async (req, res) => {
  try {
    let { activo } = req.body;
    if (activo === undefined) {
      return res.status(400).json({ message: 'Campo activo requerido' });
    }
    activo = Number(activo) === 1 ? 1 : 0;
    await service.cambiarEstado(req.params.id, activo);
    res.json({ message: 'Estado actualizado', activo });
  } catch (err) {
    console.error('❌ cambiarEstado termino:', err);
    res.status(500).json({ message: 'Error al cambiar estado' });
  }
};

const eliminar = async (req, res) => {
  try {
    await service.eliminar(req.params.id);
    res.json({ message: 'Sección eliminada correctamente' });
  } catch (err) {
    console.error('❌ eliminar termino:', err);
    res.status(500).json({ message: 'Error al eliminar sección' });
  }
};

export default { listar, obtener, crear, actualizar, cambiarEstado, eliminar };
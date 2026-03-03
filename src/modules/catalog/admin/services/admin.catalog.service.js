import libroModel from '../../models/libro.model.js';
import formatoModel from '../../models/libroFormato.model.js';

const crearLibro = async (data) => {
  return await libroModel.createLibro(data);
};

const obtenerLibrosAdmin = async () => {
  const libros = await libroModel.getAllAdmin();

  for (const libro of libros) {
    libro.formatos = await formatoModel.getByLibro(libro.id);
  }

  return libros;
};

const getCatalog = async (filters) => {
  return await libroModel.searchBooks(filters);
};

const actualizarLibro = async (id, data) => {
  return await libroModel.updateLibro(id, data);
};


const cambiarEstado = async (id, activo) => {
  return await libroModel.cambiarEstado(id, activo);
};

export default {
  crearLibro,
  obtenerLibrosAdmin,
  actualizarLibro,
  cambiarEstado,
  getCatalog
};

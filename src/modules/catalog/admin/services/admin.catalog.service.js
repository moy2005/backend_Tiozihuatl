import libroModel from '../../models/libro.model.js';
import formatoModel from '../../models/libroFormato.model.js';
import storageService from './storage.service.js';
import { refreshContentRecommender } from '../../../recommendations/services/recommendation.service.js';

const crearLibro = async (data) => {
  const id = await libroModel.createLibro(data);
  await refreshContentRecommender();
  return id;
};

const obtenerLibrosAdmin = async () => {
  const libros = await libroModel.getAllAdmin();

  for (const libro of libros) {
    libro.formatos = await formatoModel.getByLibro(libro.id);
  }

  return libros;
};

const getCatalogAdmin = async (filters) => {
  return await libroModel.searchBooksAdmin(filters);
};

const actualizarLibro = async (id, data) => {
  await libroModel.updateLibro(id, data);
  await refreshContentRecommender();
};

const cambiarEstado = async (id, activo) => {
  await libroModel.cambiarEstado(id, activo);
  await refreshContentRecommender();
};

const obtenerAutores = async () => {
  return await libroModel.getAllAutores();
};

const obtenerSemestres = async () => {
  return await libroModel.getSemestres();
};

const eliminarLibro = async (id) => {
  const pdfPublicId = await libroModel.deleteLibro(id);
  await refreshContentRecommender();

  // Si tenía PDF en Cloudinary, eliminarlo también
  if (pdfPublicId) {
    try {
      await storageService.deletePdf(pdfPublicId);
    } catch (err) {
      console.warn('⚠️ Libro eliminado pero falló borrado en Cloudinary:', err.message);
    }
  }
};

export default {
  crearLibro,
  obtenerLibrosAdmin,
  actualizarLibro,
  cambiarEstado,
  getCatalogAdmin,
  obtenerAutores,
  obtenerSemestres,
  eliminarLibro
};

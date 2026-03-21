import libroModel from '../../models/libro.model.js';

const getCatalog = async ({ search, autor, materia, formato, ordenAutor, semestre}) => {
  return await libroModel.searchBooks({ search, autor, materia, formato, ordenAutor, semestre });
};

const getMaterias = async () => {
  return await libroModel.getMaterias();
};


export default {
  getCatalog,
  getMaterias
};



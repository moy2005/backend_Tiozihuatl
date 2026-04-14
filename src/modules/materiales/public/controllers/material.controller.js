import { PublicMaterialService } from "../services/material.service.js";

export const getMaterials = async (req, res) => {
  try {
    const filters = {
      search:   req.query.search,
      materia:  req.query.materia,
      semestre: req.query.semestre,
      tipo:     req.query.tipo,
      page:     req.query.page,
      limit:    req.query.limit
    };
    const data = await PublicMaterialService.getAll(filters);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getAllWithDocente = async (req, res) => {
  try {
    const filters = {
      search:   req.query.search,
      docente:  req.query.docente,
      tipo:     req.query.tipo,
      semestre: req.query.semestre,   // ← viene automático del alumno logueado
      materia:  req.query.materia,
      page:     req.query.page,       // ← paginación
      limit:    req.query.limit,
    };
    const data = await PublicMaterialService.getAllWithDocente(filters);
    res.json(data);   // { data, total, page, limit, totalPages }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getMaterias = async (req, res) => {
  try {
    const data = await PublicMaterialService.getMaterias();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getSemestres = async (req, res) => {
  try {
    const data = await PublicMaterialService.getSemestres();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getDocentes = async (req, res) => {
  try {
    const data = await PublicMaterialService.getDocentes();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getByDocente = async (req, res) => {
  try {
    const { id } = req.params;
    const filters = {
      search:   req.query.search,
      materia:  req.query.materia,
      semestre: req.query.semestre,
      tipo:     req.query.tipo
    };
    const data = await PublicMaterialService.getByDocente(id, filters);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getDocenteInfo = async (req, res) => {
  try {
    const { id } = req.params;
    const data = await PublicMaterialService.getDocenteInfo(id);
    if (!data) return res.status(404).json({ error: 'Docente no encontrado' });
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
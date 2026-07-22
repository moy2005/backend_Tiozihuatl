import { PublicMaterialService } from "../services/material.service.js";
import { MaterialRecommendationService } from "../services/material-recommendation.service.js";

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

export const getMaterialRecommendations = async (req, res) => {
  try {
    const idMaterial = Number.parseInt(req.params.id, 10);
    const requestedLimit = Number.parseInt(req.query.limit, 10);
    const limit = Number.isFinite(requestedLimit)
      ? Math.min(Math.max(requestedLimit, 1), 5)
      : 3;
    const historyIds = String(req.query.history ?? '')
      .split(',')
      .map((value) => Number.parseInt(value, 10))
      .filter((value) => Number.isInteger(value) && value > 0)
      .slice(-10);

    if (!Number.isInteger(idMaterial) || idMaterial <= 0) {
      return res.status(400).json({ error: 'Identificador de material inválido' });
    }

    const result = await MaterialRecommendationService.getByMaterialId(idMaterial, limit, historyIds);
    if (!result) return res.status(404).json({ error: 'Material no encontrado o no disponible' });
    return res.json(result);
  } catch (error) {
    return res.status(500).json({ error: 'No se pudieron obtener las recomendaciones' });
  }
};

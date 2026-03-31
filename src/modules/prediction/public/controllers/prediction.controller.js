import {
  servicePrestamos,
  serviceAgrupados,
  serviceModelo,
  serviceHistorico,
  servicePrediccionTotal,
  serviceMateriasDisponibles,
  servicePorMateria,
} from "../services/prediction.service.js";

// ── FIG 2 — GET /prediction/prestamos ────────────────────────────────────────
export const getPrestamos = async (req, res) => {
  try {
    const data = await servicePrestamos();
    return res.status(200).json(data);
  } catch (error) {
    console.error("[Prediction] getPrestamos:", error.message);
    return res.status(500).json({
      message: "Error al obtener los préstamos.",
      error:   error.message,
    });
  }
};

// ── FIG 3 — GET /prediction/agrupados ────────────────────────────────────────
export const getAgrupados = async (req, res) => {
  try {
    const data = await serviceAgrupados();
    return res.status(200).json(data);
  } catch (error) {
    console.error("[Prediction] getAgrupados:", error.message);
    return res.status(500).json({
      message: "Error al obtener los datos agrupados.",
      error:   error.message,
    });
  }
};

// ── FIG 4 — GET /prediction/modelo ───────────────────────────────────────────
export const getModelo = async (req, res) => {
  try {
    const data = await serviceModelo();
    return res.status(200).json(data);
  } catch (error) {
    console.error("[Prediction] getModelo:", error.message);
    return res.status(500).json({
      message: "Error al calcular el modelo exponencial.",
      error:   error.message,
    });
  }
};

// ── FIG 5 — GET /prediction/historico ────────────────────────────────────────
export const getHistorico = async (req, res) => {
  try {
    const data = await serviceHistorico();
    return res.status(200).json(data);
  } catch (error) {
    console.error("[Prediction] getHistorico:", error.message);
    return res.status(500).json({
      message: "Error al obtener el histórico.",
      error:   error.message,
    });
  }
};

// ── FIG 6 — GET /prediction/total ────────────────────────────────────────────
export const getPrediccionTotal = async (req, res) => {
  try {
    const data = await servicePrediccionTotal();
    return res.status(200).json(data);
  } catch (error) {
    console.error("[Prediction] getPrediccionTotal:", error.message);
    return res.status(500).json({
      message: "Error al calcular la predicción total.",
      error:   error.message,
    });
  }
};

// ── FIG 7 — GET /prediction/materia ──────────────────────────────────────────
// Sin query param  →  devuelve listado de materias disponibles
// ?nombre=X        →  devuelve préstamos + predicción de esa materia
export const getMateria = async (req, res) => {
  try {
    const { nombre } = req.query;

    if (!nombre) {
      const data = await serviceMateriasDisponibles();
      return res.status(200).json(data);
    }

    const data = await servicePorMateria(nombre);
    return res.status(200).json(data);
  } catch (error) {
    console.error("[Prediction] getMateria:", error.message);
    return res.status(500).json({
      message: "Error al obtener datos por materia.",
      error:   error.message,
    });
  }
};
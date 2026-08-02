import {
  getAdminClusterDashboard,
  getStudentClusterShelves,
} from "../services/clustering.service.js";

const sendClusteringError = (res, error, fallback) => {
  console.error(fallback, error);
  res.status(error.statusCode || 500).json({
    message: error.publicMessage || fallback,
  });
};

export const studentClusterShelves = async (req, res) => {
  try {
    res.json(await getStudentClusterShelves(req.query.limit));
  } catch (error) {
    sendClusteringError(res, error, "No fue posible cargar los segmentos de la biblioteca.");
  }
};

export const adminClusterDashboard = async (_req, res) => {
  try {
    res.json(await getAdminClusterDashboard());
  } catch (error) {
    sendClusteringError(res, error, "No fue posible cargar el análisis del catálogo.");
  }
};

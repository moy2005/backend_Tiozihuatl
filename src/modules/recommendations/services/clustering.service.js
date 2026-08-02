import { getAvailableBooksByIds } from "../models/recommendation.model.js";
import { getMonthlyClusteringDataset } from "../models/clustering.model.js";
import { CLUSTER_PROFILES, rankClusterBooks, summarizeClusters } from "./clustering.engine.js";

const serviceUrl = (process.env.RECOMMENDER_SERVICE_URL || "http://127.0.0.1:5055").replace(/\/+$/, "");
const VARIABLES = [
  "sesiones_mes_3", "sesiones_mes_2", "sesiones_mes_1", "usuarios_unicos_3m",
  "promedio_tiempo_segundos_3m", "porcentaje_promedio_avance_3m",
  "prestamos_mes_3", "prestamos_mes_2", "prestamos_mes_1",
  "tendencia_sesiones", "tendencia_prestamos",
];

const serviceHeaders = () => {
  const headers = { Accept: "application/json", "Content-Type": "application/json" };
  if (process.env.RECOMMENDER_SERVICE_TOKEN) {
    headers["X-Recommender-Token"] = process.env.RECOMMENDER_SERVICE_TOKEN;
  }
  return headers;
};

const clusteringError = (message, statusCode = 503) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.publicMessage = message;
  return error;
};

const requestPredictions = async (rows) => {
  let response;
  try {
    response = await fetch(`${serviceUrl}/internal/clustering/predict`, {
      method: "POST",
      headers: serviceHeaders(),
      body: JSON.stringify({
        records: rows.map((row) => ({
          libro_id: Number(row.libro_id),
          ...Object.fromEntries(VARIABLES.map((field) => [field, Number(row[field]) || 0])),
        })),
      }),
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    throw clusteringError("El servicio del modelo de clustering no está disponible.");
  }

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw clusteringError(body.message || "No fue posible segmentar los libros.");
  }
  return body;
};

const buildPreviewUrl = (publicId) => process.env.CLOUDINARY_CLOUD_NAME && publicId
  ? `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload/pg_1,w_300,h_420,c_fill,f_jpg,q_auto/${publicId}.jpg`
  : null;

const calculateCurrentClusters = async () => {
  const rows = await getMonthlyClusteringDataset();
  if (!rows.length) throw clusteringError("No hay libros activos para segmentar.", 404);

  const calculated = await requestPredictions(rows);
  const predictionById = new Map(
    calculated.predictions.map((item) => [Number(item.book_id), item])
  );
  const books = rows.map((row) => {
    const prediction = predictionById.get(Number(row.libro_id));
    if (!prediction) return null;
    return {
      ...Object.fromEntries(Object.entries(row).map(([key, value]) => [
        key,
        VARIABLES.includes(key) ? Number(value) || 0 : value,
      ])),
      libro_id: Number(row.libro_id),
      cluster: Number(prediction.cluster),
      profileName: prediction.profile_name,
    };
  }).filter(Boolean);

  return {
    model: calculated.model,
    period: {
      start: rows[0].periodo_inicio,
      end: rows[0].periodo_fin,
      month3: "Mes más antiguo",
      month2: "Mes intermedio",
      month1: "Mes más reciente",
    },
    books,
  };
};

export const getAdminClusterDashboard = async () => {
  const result = await calculateCurrentClusters();
  return {
    model: result.model,
    period: result.period,
    totalBooks: result.books.length,
    profiles: summarizeClusters(result.books),
    books: result.books.map((book) => ({
      id: book.libro_id,
      titulo: book.titulo,
      cluster: book.cluster,
      profileName: book.profileName,
      action: CLUSTER_PROFILES[book.profileName].action,
      metrics: Object.fromEntries(VARIABLES.map((field) => [field, book[field]])),
    })),
  };
};

export const getStudentClusterShelves = async (limit = 12) => {
  const safeLimit = Math.min(Math.max(Number(limit) || 12, 1), 24);
  const result = await calculateCurrentClusters();
  const profiles = summarizeClusters(result.books);
  const ranked = profiles.flatMap((profile) =>
    rankClusterBooks(
      result.books.filter((book) => book.cluster === profile.cluster),
      profile.profileName,
      safeLimit * 4
    )
  );
  const catalogBooks = await getAvailableBooksByIds(ranked.map((book) => book.libro_id));
  const catalogById = new Map(catalogBooks.map((book) => [Number(book.id), book]));

  const shelves = profiles.map((profile) => ({
    cluster: profile.cluster,
    label: profile.studentLabel,
    profileName: profile.profileName,
    description: profile.description,
    icon: profile.icon,
    totalBooks: profile.totalBooks,
    books: ranked
      .filter((item) => item.cluster === profile.cluster)
      .map((item) => {
        const book = catalogById.get(item.libro_id);
        if (!book) return null;
        return {
          id: book.id,
          titulo: book.titulo,
          autores: book.autores || "Autor no disponible",
          editorial: book.editorial || "Editorial no disponible",
          materias: book.materias || null,
          disponibles: book.disponibles,
          tiene_digital: Number(book.tiene_digital) === 1,
          tiene_fisico: Number(book.tiene_fisico) === 1,
          previewUrl: buildPreviewUrl(book.pdf_url),
        };
      })
      .filter(Boolean)
      .slice(0, safeLimit),
  })).filter((profile) => profile.books.length);

  return { model: result.model, period: result.period, shelves };
};

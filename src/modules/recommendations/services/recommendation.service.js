import {
  getActiveBookById,
  getAvailableBooksByIds,
} from "../models/recommendation.model.js";

const serviceUrl = (
  process.env.RECOMMENDER_SERVICE_URL ||
  "http://127.0.0.1:5055"
).replace(/\/+$/, "");

const serviceHeaders = () => {
  const headers = { Accept: "application/json" };

  if (process.env.RECOMMENDER_SERVICE_TOKEN) {
    headers["X-Recommender-Token"] =
      process.env.RECOMMENDER_SERVICE_TOKEN;
  }

  return headers;
};

const buildPreviewUrl = (pdfPublicId) => {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  if (!cloudName || !pdfPublicId) return null;

  return `https://res.cloudinary.com/${cloudName}/image/upload/pg_1,w_300,h_420,c_fill,f_jpg,q_auto/${pdfPublicId}.jpg`;
};

const recommenderError = (message, statusCode = 503) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.publicMessage = message;
  return error;
};

const requestContentRecommendations = async (
  bookId,
  limit
) => {
  let response;

  try {
    response = await fetch(
      `${serviceUrl}/internal/recommendations/books/${bookId}?limit=${limit}`,
      {
        headers: serviceHeaders(),
        signal: AbortSignal.timeout(8000),
      }
    );
  } catch {
    throw recommenderError(
      "El servicio de recomendaciones no está disponible."
    );
  }

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw recommenderError(
      body.message ||
        "No fue posible calcular las recomendaciones.",
      response.status === 404 ? 404 : 503
    );
  }

  return body;
};

export const getBookRecommendations = async (
  bookId,
  limit = 5
) => {
  const sourceBook = await getActiveBookById(bookId);
  if (!sourceBook) return null;

  const safeLimit = Math.min(
    Math.max(Number(limit) || 5, 1),
    5
  );
  const calculated = await requestContentRecommendations(
    bookId,
    20
  );
  const scores = calculated.recommendations || [];
  const availableBooks = await getAvailableBooksByIds(
    scores.map((item) => item.book_id)
  );
  const booksById = new Map(
    availableBooks.map((book) => [
      Number(book.id),
      book,
    ])
  );

  const recommendations = scores
    .map((item) => {
      const book = booksById.get(Number(item.book_id));
      if (!book) return null;

      const sharedFeatures =
        item.shared_features || [];

      return {
        id: book.id,
        titulo: book.titulo,
        editorial: book.editorial,
        autores:
          book.autores || "Autor no disponible",
        materias:
          book.materias || "Materia no disponible",
        semestres: book.semestres || null,
        disponibles: book.disponibles,
        tiene_digital:
          Number(book.tiene_digital) === 1,
        tiene_fisico:
          Number(book.tiene_fisico) === 1,
        previewUrl: buildPreviewUrl(book.pdf_url),
        similitud_coseno: Number(
          item.cosine_similarity
        ),
        angulo_grados: Number(item.angle_degrees),
        caracteristicas_compartidas:
          sharedFeatures,
        cantidad_caracteristicas_compartidas:
          Number(item.shared_feature_count) ||
          sharedFeatures.length,
        motivo: sharedFeatures.length
          ? `Comparte ${sharedFeatures.join(", ")}.`
          : "Comparte contenido con el libro consultado.",
      };
    })
    .filter(Boolean)
    .slice(0, safeLimit);

  return {
    libro_origen: sourceBook,
    modelo: {
      tipo: "recomendacion_basada_en_contenido",
      medida: "similitud_coseno",
      version_artefacto:
        calculated.model.schema_version,
      generado_en: calculated.model.generated_at,
    },
    recomendaciones: recommendations,
  };
};

export const refreshContentRecommender = async () => {
  try {
    const response = await fetch(
      `${serviceUrl}/internal/rebuild`,
      {
        method: "POST",
        headers: serviceHeaders(),
        signal: AbortSignal.timeout(30000),
      }
    );

    if (!response.ok) {
      const body = await response
        .json()
        .catch(() => ({}));
      console.warn(
        "[Recommendations] No se actualizó el artefacto:",
        body.message || response.statusText
      );
      return false;
    }

    return true;
  } catch {
    console.warn(
      "[Recommendations] Servicio Python no disponible para actualizar el artefacto."
    );
    return false;
  }
};

import { readFileSync } from "node:fs";
import {
  getActiveBookById,
  getAvailableBooksByTitles,
  getUserKnownBookTitles,
} from "../models/recommendation.model.js";
import { normalizeTitle, scoreRecommendations } from "./recommendation.engine.js";

const artifactUrl = new URL("../data/association-rules.json", import.meta.url);
const artifact = JSON.parse(readFileSync(artifactUrl, "utf8"));

const buildPreviewUrl = (pdfPublicId) => {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  if (!cloudName || !pdfPublicId) return null;
  return `https://res.cloudinary.com/${cloudName}/image/upload/pg_1,w_300,h_420,c_fill,f_jpg,q_auto/${pdfPublicId}.jpg`;
};

export const getBookRecommendations = async (bookId, userId, limit = 1) => {
  const sourceBook = await getActiveBookById(bookId);
  if (!sourceBook) return null;

  const safeLimit = Math.min(Math.max(Number(limit) || 1, 1), 5);
  const historyTitles = await getUserKnownBookTitles(userId, sourceBook.id);
  const currentTitleKey = normalizeTitle(sourceBook.titulo);
  const relevantRules = artifact.rules.filter((rule) =>
    rule.antecedents.some((title) => normalizeTitle(title) === currentTitleKey)
  );
  const scored = scoreRecommendations(
    [sourceBook.titulo, ...historyTitles],
    relevantRules,
    20
  );
  const availableBooks = await getAvailableBooksByTitles(scored.map((item) => item.title));
  const booksByTitle = new Map(
    availableBooks.map((book) => [normalizeTitle(book.titulo), book])
  );

  const recommendations = scored
    .map((item) => {
      const book = booksByTitle.get(normalizeTitle(item.title));
      if (!book) return null;

      return {
        id: book.id,
        titulo: book.titulo,
        autores: book.autores || "Autor no disponible",
        materias: book.materias || "Área académica relacionada",
        semestres: book.semestres || null,
        disponibles: book.disponibles,
        tiene_digital: Number(book.tiene_digital) === 1,
        tiene_fisico: Number(book.tiene_fisico) === 1,
        previewUrl: buildPreviewUrl(book.pdf_url),
        score: Number(item.score.toFixed(6)),
        reglas_coincidentes: item.matchingRules,
        nivel_evidencia: item.evidenceLevel,
        confianza: item.confidence,
        lift: item.lift,
        motivo: `Una regla Apriori relaciona tu lectura actual con este título.`,
      };
    })
    .filter(Boolean)
    .slice(0, safeLimit);

  return {
    libro_origen: sourceBook,
    modelo: {
      tipo: artifact.modelType,
      reglas_evaluadas: relevantRules.length,
    },
    recomendaciones: recommendations,
  };
};

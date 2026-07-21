import { readFileSync } from "node:fs";
import { getActiveBookById, getAvailableBooksByTitles } from "../models/recommendation.model.js";
import { normalizeTitle, scoreRecommendations } from "./recommendation.engine.js";

const artifactUrl = new URL("../data/association-rules.v1.json", import.meta.url);
const artifact = JSON.parse(readFileSync(artifactUrl, "utf8"));

const buildPreviewUrl = (pdfPublicId) => {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  if (!cloudName || !pdfPublicId) return null;
  return `https://res.cloudinary.com/${cloudName}/image/upload/pg_1,w_300,h_420,c_fill,f_jpg,q_auto/${pdfPublicId}.jpg`;
};

export const getBookRecommendations = async (bookId, limit = 1) => {
  const sourceBook = await getActiveBookById(bookId);
  if (!sourceBook) return null;

  // Se solicitan candidatos extra por si alguna regla apunta a un libro inactivo
  // o sin formato disponible actualmente.
  const scored = scoreRecommendations([sourceBook.titulo], artifact.rules, 20);
  const availableBooks = await getAvailableBooksByTitles(scored.map((item) => item.title));
  const booksByTitle = new Map(
    availableBooks.map((book) => [normalizeTitle(book.titulo), book])
  );

  const safeLimit = Math.min(Math.max(Number(limit) || 1, 1), 5);
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
        motivo: `Quienes consultaron “${sourceBook.titulo}” también relacionaron este título.`,
      };
    })
    .filter(Boolean)
    .slice(0, safeLimit);

  return {
    libro_origen: sourceBook,
    modelo: {
      tipo: artifact.modelType,
      version: artifact.schemaVersion,
      reglas_evaluadas: artifact.rules.length,
    },
    recomendaciones: recommendations,
  };
};

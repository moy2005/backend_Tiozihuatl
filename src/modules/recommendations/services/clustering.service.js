import { readFileSync } from "node:fs";
import { getAvailableBooksByIds } from "../models/recommendation.model.js";
import { selectClusterBooks } from "./clustering.engine.js";

const artifact = JSON.parse(readFileSync(new URL("../data/book-clusters.json", import.meta.url), "utf8"));
const buildPreviewUrl = (publicId) => process.env.CLOUDINARY_CLOUD_NAME && publicId
  ? `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload/pg_1,w_300,h_420,c_fill,f_jpg,q_auto/${publicId}.jpg`
  : null;

export const getStudentClusterShelves = async (limit = 12) => {
  const safeLimit = Math.min(Math.max(Number(limit) || 12, 1), 24);
  const selected = [2, 1, 0].flatMap((cluster) => selectClusterBooks(artifact.books, cluster, safeLimit * 5));
  const catalogBooks = await getAvailableBooksByIds(selected.map((book) => book.bookId));
  const catalogById = new Map(catalogBooks.map((book) => [Number(book.id), book]));

  const shelves = [2, 1, 0].map((cluster) => {
    const profile = artifact.profiles[String(cluster)];
    const books = selected.filter((item) => item.cluster === cluster).map((item) => {
      const book = catalogById.get(item.bookId);
      if (!book) return null;
      return {
        id: book.id, titulo: book.titulo, autores: book.autores || "Autor no disponible",
        editorial: book.editorial || "Editorial no disponible", materias: book.materias || null,
        disponibles: book.disponibles, tiene_digital: Number(book.tiene_digital) === 1,
        tiene_fisico: Number(book.tiene_fisico) === 1, previewUrl: buildPreviewUrl(book.pdf_url),
      };
    }).filter(Boolean).slice(0, safeLimit);
    return {
      cluster,
      label: profile.studentLabel,
      profileName: profile.name,
      description: profile.description,
      icon: profile.icon,
      totalBooks: artifact.books.filter((book) => book.cluster === cluster).length,
      books,
    };
  }).filter((shelf) => shelf.books.length);

  return { model: { type: artifact.modelType, k: artifact.k, generatedAt: artifact.generatedAt }, shelves };
};

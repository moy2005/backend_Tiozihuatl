/**
 * Clasificador de intenciones del asistente.
 *
 * Cada tema se representa con las raíces de sus palabras clave, ejemplos y
 * título, ponderadas con TF-IDF: las palabras exclusivas de un tema pesan más
 * que las que comparten varios. Un mensaje se compara por raíces compatibles
 * (con tolerancia a variaciones de la palabra) y recibe un bonus cuando
 * contiene todas las palabras de alguno de los ejemplos del tema.
 */
import { analyze, stem, stemsMatch } from "./assistant.language.js";

const KEYWORD_WEIGHT = 2.2;
const EXAMPLE_WEIGHT = 1;

export const buildIntentIndex = (topics) => {
  const docs = topics.map((topic) => {
    const weights = new Map();
    const addStems = (text, weight) => {
      for (const s of analyze(text).stems) {
        weights.set(s, Math.max(weights.get(s) || 0, weight));
      }
    };
    (topic.keywords || []).forEach((keyword) => addStems(keyword, KEYWORD_WEIGHT));
    (topic.examples || []).forEach((example) => addStems(example, EXAMPLE_WEIGHT));
    addStems(topic.title || "", EXAMPLE_WEIGHT);

    const phrases = [...(topic.keywords || []), ...(topic.examples || [])]
      .map((text) => analyze(text).stems)
      .filter((stems) => stems.length >= 2);

    return { topic, weights, phrases };
  });

  const documentFrequency = new Map();
  for (const doc of docs) {
    for (const s of doc.weights.keys()) documentFrequency.set(s, (documentFrequency.get(s) || 0) + 1);
  }
  const total = docs.length;
  const idf = (s) => Math.log(1 + total / (documentFrequency.get(s) || total));

  return { docs, idf };
};

/** Raíces del tema compatibles con una raíz del mensaje. */
const matchingStem = (doc, messageStem) => {
  if (doc.weights.has(messageStem)) return messageStem;
  for (const s of doc.weights.keys()) {
    if (stemsMatch(s, messageStem)) return s;
  }
  return null;
};

/**
 * Ordena los temas para un análisis de mensaje. Devuelve por tema:
 * score, raíces del mensaje explicadas (matched) y cobertura (0..1).
 */
export const rankIntents = (analysis, index) => {
  const messageStems = analysis.stems;

  return index.docs
    .map((doc) => {
      let score = 0;
      const matched = [];
      for (const s of messageStems) {
        const hit = matchingStem(doc, s);
        if (!hit) continue;
        score += doc.weights.get(hit) * index.idf(hit);
        matched.push(s);
      }

      // Ejemplo completo contenido en el mensaje: señal fuerte de intención.
      let phraseBonus = 0;
      for (const phrase of doc.phrases) {
        const covered = phrase.every((p) => messageStems.some((s) => stemsMatch(s, p)));
        if (covered) phraseBonus = Math.max(phraseBonus, 1.2 * phrase.length);
      }
      score += phraseBonus;
      if (score > 0) score += Number(doc.topic.priority || 0) * 0.04;

      return {
        topic: doc.topic,
        score,
        matched,
        coverage: messageStems.length ? matched.length / messageStems.length : 0,
      };
    })
    .sort((a, b) => b.score - a.score);
};

/** Confianza 0..1 a partir de la puntuación del mejor tema. */
export const confidenceOf = (ranked) => {
  const best = ranked[0];
  if (!best || best.score <= 0) return 0;
  const margin = ranked[1] ? best.score - ranked[1].score : best.score;
  const base = best.score / (best.score + 3.5);
  return Math.min(0.98, base * (margin > 0.5 ? 1 : 0.85));
};

/** Raíces que identifican un tema (para excluirlas de los términos de búsqueda). */
export const topicStems = (topic) =>
  new Set([...(topic?.keywords || []), topic?.title || ""].flatMap((text) => analyze(text).stems).map(stem));

export const normalizeTitle = (title) => String(title || "")
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLocaleLowerCase("es-MX")
  .replace(/\s+/g, " ")
  .trim();

/**
 * Implementación portable de recomendar_libros de la libreta Apriori.
 * Suma el score de las reglas que coinciden y nunca recomienda un libro conocido.
 */
export const scoreRecommendations = (knownBooks, rules, limit = 5) => {
  const known = new Set(knownBooks.map(normalizeTitle).filter(Boolean));
  const scored = new Map();

  for (const rule of rules) {
    const antecedents = rule.antecedents.map(normalizeTitle);
    const consequentKey = normalizeTitle(rule.consequent);

    if (!antecedents.every((title) => known.has(title)) || known.has(consequentKey)) {
      continue;
    }

    const current = scored.get(consequentKey) || {
      title: rule.consequent,
      score: 0,
      matchingRules: 0,
      evidenceLevel: rule.evidenceLevel,
      confidence: 0,
      lift: 0,
      support: 0,
    };

    current.score += Number(rule.score ?? (rule.support * rule.confidence * rule.lift));
    current.matchingRules += 1;
    current.confidence = Math.max(current.confidence, Number(rule.confidence));
    current.lift = Math.max(current.lift, Number(rule.lift));
    current.support = Math.max(current.support, Number(rule.support));
    if (rule.evidenceLevel === "CONSOLIDADA") current.evidenceLevel = "CONSOLIDADA";
    scored.set(consequentKey, current);
  }

  const safeLimit = Math.min(Math.max(Number(limit) || 5, 1), 20);
  return [...scored.values()]
    .sort((a, b) => b.score - a.score || b.matchingRules - a.matchingRules)
    .slice(0, safeLimit);
};

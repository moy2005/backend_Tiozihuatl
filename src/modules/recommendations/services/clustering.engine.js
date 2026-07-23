const rankers = {
  "Baja utilización": (book) => book.metrics.readingSessions + book.metrics.uniqueReaders,
  "Consulta rápida": (book) => book.metrics.readingSessions + book.metrics.uniqueReaders * 2,
  "Estudio intensivo": (book) => book.metrics.averageReadingSeconds / 60 + book.metrics.averageProgressPercent,
};

export const selectClusterBooks = (books, cluster, limit = 4, profileName = "Consulta rápida") => books
  .filter((book) => book.cluster === cluster)
  .sort((a, b) => rankers[profileName](b) - rankers[profileName](a))
  .slice(0, limit);

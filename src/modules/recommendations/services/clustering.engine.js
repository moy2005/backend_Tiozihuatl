const rankers = {
  0: (book) => book.metrics.readingSessions + book.metrics.uniqueReaders,
  1: (book) => book.metrics.readingSessions + book.metrics.uniqueReaders * 2,
  2: (book) => book.metrics.averageReadingSeconds / 60 + book.metrics.averageProgressPercent,
};

export const selectClusterBooks = (books, cluster, limit = 4) => books
  .filter((book) => book.cluster === cluster)
  .sort((a, b) => rankers[cluster](b) - rankers[cluster](a))
  .slice(0, limit);

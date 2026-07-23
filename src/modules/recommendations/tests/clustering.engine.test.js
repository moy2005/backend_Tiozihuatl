import test from "node:test";
import assert from "node:assert/strict";
import { selectClusterBooks } from "../services/clustering.engine.js";

test("selecciona solamente libros del cluster solicitado y respeta el limite", () => {
  const books = [
    { bookId: 1, cluster: 1, metrics: { readingSessions: 3, uniqueReaders: 2 } },
    { bookId: 2, cluster: 1, metrics: { readingSessions: 10, uniqueReaders: 5 } },
    { bookId: 3, cluster: 2, metrics: { averageReadingSeconds: 900, averageProgressPercent: 70 } },
  ];
  assert.deepEqual(selectClusterBooks(books, 1, 1, "Consulta rápida").map((book) => book.bookId), [2]);
});

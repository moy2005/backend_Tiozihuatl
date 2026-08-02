import test from "node:test";
import assert from "node:assert/strict";
import { rankClusterBooks, summarizeClusters } from "../services/clustering.engine.js";

const book = (id, cluster, profileName, overrides = {}) => ({
  libro_id: id,
  cluster,
  profileName,
  sesiones_mes_3: 0,
  sesiones_mes_2: 0,
  sesiones_mes_1: 0,
  usuarios_unicos_3m: 0,
  promedio_tiempo_segundos_3m: 0,
  porcentaje_promedio_avance_3m: 0,
  prestamos_mes_3: 0,
  prestamos_mes_2: 0,
  prestamos_mes_1: 0,
  tendencia_sesiones: 0,
  tendencia_prestamos: 0,
  ...overrides,
});

test("prioriza los préstamos recientes del perfil principalmente físico", () => {
  const books = [
    book(1, 0, "Uso principalmente físico", { prestamos_mes_1: 4 }),
    book(2, 0, "Uso principalmente físico", { prestamos_mes_1: 12 }),
  ];
  assert.equal(rankClusterBooks(books, "Uso principalmente físico", 1)[0].libro_id, 2);
});

test("resume cantidades y promedios sin depender del número interno", () => {
  const profiles = summarizeClusters([
    book(1, 2, "Uso digital emergente", { tendencia_sesiones: 0.2 }),
    book(2, 2, "Uso digital emergente", { tendencia_sesiones: 0.4 }),
  ]);
  assert.equal(profiles[0].totalBooks, 2);
  assert.equal(profiles[0].averages.tendencia_sesiones, 0.3);
  assert.equal(profiles[0].studentLabel, "Descubre recursos digitales");
});

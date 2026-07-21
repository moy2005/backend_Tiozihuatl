import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { scoreRecommendations } from "../services/recommendation.engine.js";

const artifact = JSON.parse(
  readFileSync(new URL("../data/association-rules.v1.json", import.meta.url), "utf8")
);

test("recomienda el consecuente mejor puntuado para un libro conocido", () => {
  const result = scoreRecommendations(
    ["Enfermería Médico-Quirúrgica: casos clínicos y planes de cuidado"],
    artifact.rules,
    5
  );

  assert.equal(result[0].title, "Protocolos de atención en Enfermería Médico-Quirúrgica");
  assert.equal(result[1].title, "Intervenciones de enfermería en Enfermería Médico-Quirúrgica");
});

test("normaliza mayúsculas y acentos al buscar antecedentes", () => {
  const result = scoreRecommendations(
    ["ANATOMIA APLICADA PARA ESTUDIANTES DE ODONTOLOGIA"],
    artifact.rules,
    1
  );

  assert.equal(result[0].title, "Protocolos de atención en Enfermería Médico-Quirúrgica");
});

test("no recomienda libros que ya forman parte de los conocidos", () => {
  const result = scoreRecommendations(
    [
      "Enfermería Médico-Quirúrgica: casos clínicos y planes de cuidado",
      "Protocolos de atención en Enfermería Médico-Quirúrgica",
    ],
    artifact.rules,
    5
  );

  assert.equal(result.some((item) => item.title.startsWith("Protocolos de atención")), false);
});

test("devuelve una lista vacía cuando ninguna regla coincide", () => {
  assert.deepEqual(scoreRecommendations(["Libro sin reglas"], artifact.rules), []);
});

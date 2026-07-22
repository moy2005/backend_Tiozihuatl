import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { scoreRecommendations } from "../services/recommendation.engine.js";

const artifact = JSON.parse(
  readFileSync(new URL("../data/association-rules.json", import.meta.url), "utf8")
);

test("ordena los consecuentes coincidentes por puntuación", () => {
  const result = scoreRecommendations(
    ["Enfermería Médico-Quirúrgica: casos clínicos y planes de cuidado"],
    artifact.rules,
    5
  );

  assert.ok(result.length >= 2);
  assert.ok(result[0].score >= result[1].score);
  assert.ok(result.every((item) => item.matchingRules >= 1));
});

test("normaliza mayúsculas y acentos al buscar antecedentes", () => {
  const normalizedResult = scoreRecommendations(
    ["ANATOMIA APLICADA PARA ESTUDIANTES DE ODONTOLOGIA"],
    artifact.rules,
    5
  );
  const originalResult = scoreRecommendations(
    ["Anatomía Aplicada para Estudiantes de Odontología"],
    artifact.rules,
    5
  );

  assert.deepEqual(normalizedResult, originalResult);
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

test("activa antecedentes de dos libros solo cuando ambos están presentes", () => {
  const twoBookRule = artifact.rules.find((rule) => rule.antecedents.length === 2);
  assert.ok(twoBookRule, "El artefacto debe incluir al menos un antecedente doble");

  const complete = scoreRecommendations(twoBookRule.antecedents, [twoBookRule], 5);
  const incomplete = scoreRecommendations([twoBookRule.antecedents[0]], [twoBookRule], 5);

  assert.equal(complete[0].title, twoBookRule.consequent);
  assert.deepEqual(incomplete, []);
});

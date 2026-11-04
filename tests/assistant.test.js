/**
 * Pruebas del asistente virtual (sin base de datos real).
 * Ejecutar con: npm run test:assistant
 */
import { after, before, beforeEach, describe, it, mock } from "node:test";
import assert from "node:assert/strict";

// La conexión real a MySQL se sustituye por un pool vacío.
mock.module("../src/config/db.config.js", {
  namedExports: { poolPromise: { query: async () => [[]] } },
});

const { analyze, Vocabulary, stem, stemsMatch } = await import("../src/modules/assistant/services/assistant.language.js");
const { assessScope } = await import("../src/modules/assistant/services/assistant.scope.js");
const { AssistantModel } = await import("../src/modules/assistant/models/assistant.model.js");
const { AssistantService } = await import("../src/modules/assistant/services/assistant.service.js");

/* ── Datos simulados ─────────────────────────────────────────────── */

const BOOKS = [
  { id: 1, titulo: "Anatomía y fisiología humana", autores: "Tortora; Derrickson", materias: "Anatomía", disponibles: 2, tiene_fisico: 1, tiene_digital: 0 },
  { id: 2, titulo: "Atlas de anatomía", autores: "Netter", materias: "Anatomía", disponibles: 0, tiene_fisico: 1, tiene_digital: 1 },
  { id: 3, titulo: "Farmacología para enfermería", autores: "Somoza", materias: "Farmacología", disponibles: 1, tiene_fisico: 1, tiene_digital: 0 },
  { id: 4, titulo: "Anatomía clínica", autores: "Moore", materias: "Anatomía", disponibles: 1, tiene_fisico: 1, tiene_digital: 0 },
  { id: 5, titulo: "Anatomía básica", autores: "Latarjet", materias: "Anatomía", disponibles: 3, tiene_fisico: 1, tiene_digital: 0 },
  { id: 6, titulo: "Anatomía topográfica", autores: "Rouvière", materias: "Anatomía", disponibles: 1, tiene_fisico: 1, tiene_digital: 0 },
];

const EVENTS = [
  { id_evento: 10, titulo: "Congreso de enfermería", tipo: "PRESENCIAL", ubicacion: "Auditorio", fecha_inicio: "2026-11-20T10:00:00", estado: "Publicado" },
];

const fold = (value) => String(value).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const matchesAll = (row, terms, fields) => terms.every((t) => fields.some((f) => fold(row[f] || "").includes(fold(t))));

const calls = [];
const stubModel = () => {
  calls.length = 0;
  mock.method(AssistantModel, "getVocabularyTerms", async () => [...BOOKS.map((b) => b.titulo), "Farmacología", "Tortora"]);
  mock.method(AssistantModel, "getFaqs", async () => []);
  mock.method(AssistantModel, "getAbout", async () => []);
  mock.method(AssistantModel, "getCalendars", async () => [{ id: 1, titulo: "Calendario 2026", tipo_calendario: "ESCOLAR", archivo_url: "https://example.com/c.pdf" }]);
  mock.method(AssistantModel, "saveInteraction", async () => undefined);
  mock.method(AssistantModel, "getUserSummary", async () => null);
  mock.method(AssistantModel, "getUserLoans", async () => []);
  mock.method(AssistantModel, "searchNews", async () => []);
  mock.method(AssistantModel, "searchMagazines", async () => []);
  mock.method(AssistantModel, "searchMaterials", async (terms) => {
    calls.push({ type: "materials", terms });
    return [];
  });
  mock.method(AssistantModel, "searchEvents", async (terms, { excludeIds = [] } = {}) => {
    calls.push({ type: "events", terms });
    return EVENTS.filter((e) => !excludeIds.includes(e.id_evento) && matchesAll(e, terms, ["titulo"]));
  });
  mock.method(AssistantModel, "searchBooks", async (terms, { limit = 4, excludeIds = [] } = {}) => {
    calls.push({ type: "books", terms, excludeIds });
    return BOOKS.filter((b) => !excludeIds.includes(b.id) && matchesAll(b, terms, ["titulo", "autores", "materias"])).slice(0, limit);
  });
};

/** Envía una conversación y devuelve cada respuesta. */
const chat = async (...messages) => {
  const history = [];
  const replies = [];
  for (const message of messages) {
    const response = await AssistantService.answer({ message, context: { sessionId: "test", history }, authenticatedUser: null, reqMeta: {} });
    history.push({ sender: "user", text: message });
    history.push({
      sender: "assistant",
      text: response.reply,
      intentId: response.intent.id,
      searchType: response.meta.searchType,
      searchTerms: response.meta.searchTerms,
      shownIds: response.meta.shownIds,
    });
    replies.push(response);
  }
  return replies;
};
const ask = async (message) => (await chat(message))[0];

/* ── Lenguaje ────────────────────────────────────────────────────── */

describe("lenguaje", () => {
  const vocab = new Vocabulary(["prestamo prestamos calendario anatomia farmacologia contrasena biblioteca"]);

  it("normaliza acentos, mayúsculas y letras repetidas", () => {
    assert.equal(analyze("¡¡HOLAAA, Préstamos!!").text, "hola prestamos");
  });

  it("expande abreviaturas informales", () => {
    assert.deepEqual(analyze("xq no tengo la pass").words, ["porque", "no", "tengo", "la", "contrasena"]);
  });

  it("corrige erratas y palabras recortadas", () => {
    assert.equal(analyze("anatomya", vocab).words[0], "anatomia");
    assert.equal(analyze("prestmo", vocab).words[0], "prestamo");
    assert.equal(analyze("calend", vocab).words[0], "calendario");
  });

  it("reduce variantes a la misma raíz", () => {
    assert.ok(stemsMatch(stem("prestamos"), stem("prestamo")));
    assert.ok(stemsMatch(stem("anatomia"), stem("anatomicas")));
  });
});

/* ── Moderación ──────────────────────────────────────────────────── */

describe("moderación", () => {
  it("detecta insultos, incluso ofuscados", () => {
    assert.ok(assessScope("eres un pendejo").offensive);
    assert.ok(assessScope("p3nd3jo").offensive);
    assert.ok(assessScope("p u t o").offensive);
    assert.ok(assessScope("eres un inútil").offensive);
  });

  it("no penaliza expresiones coloquiales ni términos de anatomía", () => {
    assert.ok(!assessScope("no manches wey, ¿qué onda con los préstamos?").offensive);
    assert.ok(!assessScope("está bien padre la biblioteca").offensive);
    assert.ok(!assessScope("libro sobre aparato reproductor y pene").offensive);
    assert.ok(!assessScope("salud sexual y reproductiva").offensive);
  });

  it("separa soporte y temas ajenos", () => {
    assert.ok(assessScope("quiero hablar con alguien").support);
    assert.ok(assessScope("la página no carga, error 500").support);
    assert.ok(assessScope("¿quién ganó el partido del américa?").offTopic);
    assert.ok(!assessScope("error 404").offensive);
  });
});

/* ── Respuestas ──────────────────────────────────────────────────── */

describe("respuestas del asistente", () => {
  before(stubModel);
  beforeEach(() => {
    calls.length = 0;
  });
  after(() => mock.restoreAll());

  const intentOf = async (message) => (await ask(message)).intent.id;

  it("reconoce la misma petición escrita de formas distintas", async () => {
    for (const message of [
      "¿Cómo pido un préstamo?",
      "como le hago para que me presten un libro",
      "kiero sacar un libro prestado",
      "cuantos dias me dan de prestamo",
    ]) {
      assert.equal(await intentOf(message), "loans", message);
    }
  });

  it("entiende cambios de contraseña con jerga y erratas", async () => {
    for (const message of ["olvide mi contraseña", "no me acuerdo de mi pass", "como recupero la contra", "olvide mi contrasña"]) {
      assert.equal(await intentOf(message), "password", message);
    }
  });

  it("identifica eventos, calendario y materiales", async () => {
    assert.equal(await intentOf("qué eventos hay esta semana"), "events");
    assert.equal(await intentOf("cuando empiezan las vacaciones"), "calendar");
    assert.equal(await intentOf("donde encuentro los apuntes de mi profe"), "student_materials");
  });

  it("busca libros con los términos útiles del mensaje", async () => {
    const response = await ask("busco un libro de anatomya");
    assert.equal(response.intent.id, "catalog");
    assert.deepEqual(response.meta.searchTerms, ["anatomia"]);
    assert.equal(response.sections[0].items.length, 4);
    // Se muestra con su escritura correcta aunque el usuario la haya escrito con errata.
    assert.match(response.reply, /«anatomía»/);
  });

  it("admite con naturalidad cuando no hay resultados", async () => {
    const response = await ask("tienen libros de astrofísica cuántica");
    assert.equal(response.sections.length, 0);
    assert.match(response.reply, /No encontré libros/);
  });

  it("mantiene el contexto en preguntas de seguimiento", async () => {
    const [, followUp] = await chat("busco libros de anatomía", "¿y de farmacología?");
    assert.equal(followUp.intent.id, "catalog");
    assert.equal(followUp.meta.contextUsed, true);
    assert.deepEqual(followUp.meta.searchTerms, ["farmacologia"]);
    assert.equal(followUp.sections[0].items[0].title, "Farmacología para enfermería");
  });

  it("muestra más resultados sin repetir los anteriores", async () => {
    const [first, more] = await chat("busco libros de anatomía", "dame más");
    const firstTitles = first.sections[0].items.map((item) => item.title);
    const moreTitles = more.sections[0].items.map((item) => item.title);
    assert.ok(moreTitles.length > 0);
    assert.ok(moreTitles.every((title) => !firstTitles.includes(title)));
  });

  it("responde con un límite respetuoso ante insultos", async () => {
    const response = await ask("eres un pinche bot inútil");
    assert.equal(response.intent.id, "out_of_scope_offensive");
    assert.equal(response.sections.length, 0);
  });

  it("atiende la consulta académica aunque incluya una grosería", async () => {
    const response = await ask("no encuentro el pinche libro de anatomia, que mierda");
    assert.equal(response.intent.id, "catalog");
    assert.match(response.reply, /cuidemos el lenguaje/);
  });

  it("no castiga el lenguaje coloquial", async () => {
    const response = await ask("no manches wey, ¿cómo pido un préstamo?");
    assert.equal(response.intent.id, "loans");
    assert.doesNotMatch(response.reply, /respet|lenguaje/i);
  });

  it("no ofrece soporte ni contacto con personas", async () => {
    for (const message of ["quiero hablar con alguien", "quiero reportar una falla", "la app no carga"]) {
      const response = await ask(message);
      assert.equal(response.intent.id, "out_of_scope_support", message);
      assert.ok(!response.actions.some((action) => /contact/i.test(action.route || "")), message);
    }
  });

  it("redirige con amabilidad los temas ajenos", async () => {
    for (const message of ["quién ganó el partido del américa", "cuéntame un chiste", "dame una receta de pizza"]) {
      assert.equal(await intentOf(message), "out_of_scope_offTopic", message);
    }
  });

  it("no menciona al administrador en ninguna respuesta", async () => {
    for (const message of ["qué roles hay", "cómo publico material", "como registro un libro", "cómo creo un evento"]) {
      const response = await ask(message);
      assert.doesNotMatch(JSON.stringify(response), /administrador|\/admin/i, message);
    }
  });

  it("responde a la conversación social", async () => {
    assert.equal(await intentOf("hola"), "greeting");
    assert.equal(await intentOf("gracias!!"), "gratitude");
    assert.equal(await intentOf("quién eres"), "assistant_identity");
  });

  it("pide iniciar sesión para datos personales", async () => {
    const response = await ask("tengo libros prestados?");
    assert.equal(response.intent.id, "personal_loans");
    assert.equal(response.actions[0].route, "/login");
  });

  it("admite cuando no entiende", async () => {
    const response = await ask("asdkj qwe zxcv");
    assert.equal(response.intent.id, "fallback");
  });
});

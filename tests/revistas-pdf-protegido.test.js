/**
 * PDF de revistas protegidos (YenniferM098/tiozihuatl-mobile#197), sin base de datos ni Cloudinary reales.
 * Monta el router real de revistas y comprueba que las respuestas públicas no exponen el
 * identificador del PDF y que solo quien compró recibe la dirección firmada.
 * Ejecutar con: npm run test:revistas
 */
import { after, before, describe, it, mock } from "node:test";
import assert from "node:assert/strict";
import express from "express";

process.env.JWT_SECRET = process.env.JWT_SECRET || "secreto-de-prueba";
process.env.CLOUDINARY_CLOUD_NAME = "demo";
process.env.CLOUDINARY_API_KEY = "123";
process.env.CLOUDINARY_API_SECRET = "secreto-cloudinary-de-prueba";

const COMPRADOR = 7;
const PDF_ID = "magazines/revistas/salud_abc123";
const revista = {
  id_magazine: 3,
  id_revista: 3,
  titulo: "Salud comunitaria",
  descripcion: "Revista",
  precio: 10,
  stock: 5,
  pdf_public_id: PDF_ID,
  portada_url: null,
};

mock.module("../src/config/db.config.js", {
  namedExports: {
    poolPromise: {
      query: async (sql, params = []) => {
        if (/SELECT 1\s+FROM tokensrefresh/.test(sql)) return [[{ 1: 1 }]];
        // Compra pagada: solo el usuario COMPRADOR adquirió la revista 3.
        if (/FROM compras c/.test(sql)) {
          return [params[0] === COMPRADOR && params[1] === 3 ? [{ pdf_public_id: PDF_ID }] : []];
        }
        if (/FROM revistas/.test(sql)) return [[{ ...revista }]];
        return [[]];
      },
    },
  },
});

/** Dirección firmada que la app acepta (isMagazinePdfUrl en tiozihuatl-mobile). */
const FIRMADA = /^https:\/\/res\.cloudinary\.com\/demo\/image\/authenticated\/s--[\w-]{8,}--\//;
/** Ruta sin parámetros: la app valida la ruta (el SDK agrega ?_a=... al final). */
const ruta = (url) => new URL(url).pathname;

let server;
let base;
let JWTService;
let files;

before(async () => {
  const { default: routes } = await import("../src/modules/magazines/routes/magazines.routes.js");
  ({ JWTService } = await import("../src/core/services/jwt.service.js"));
  files = await import("../src/modules/magazines/services/magazine-files.js");
  const app = express();
  app.use("/api/magazines", routes);
  await new Promise((resolve) => { server = app.listen(0, resolve); });
  base = `http://127.0.0.1:${server.address().port}/api/magazines`;
});

after(() => server?.close());

const token = (id) => JWTService.generateAccessToken({ id, id_usuario: id, rol: "Visitante", correo: "prueba@correo.com" });
const get = async (ruta, id) => {
  const res = await fetch(base + ruta, { headers: id ? { Authorization: `Bearer ${token(id)}` } : {} });
  return { status: res.status, body: await res.json() };
};

describe("Dirección firmada y portada", () => {
  it("el PDF se entrega como authenticated, firmado y en formato pdf", () => {
    const url = files.signedPdfUrl(`${PDF_ID}.pdf`);
    assert.match(url, FIRMADA);
    assert.match(ruta(url), /\/magazines\/revistas\/salud_abc123\.pdf$/);
    assert.doesNotMatch(url, /\/upload\//);
  });

  it("la portada es solo la primera página como imagen, también firmada", () => {
    const url = files.signedCoverUrl(PDF_ID);
    assert.match(url, FIRMADA);
    assert.match(url, /pg_1/);
    assert.match(ruta(url), /\.jpg$/);
    assert.equal(files.signedCoverUrl(""), null);
  });

  it("la firma cambia si se altera la transformación (no se puede pedir el PDF desde la portada)", () => {
    const portada = files.signedCoverUrl(PDF_ID);
    const alterada = portada.replace(".jpg", ".pdf");
    assert.notEqual(files.signedPdfUrl(PDF_ID), alterada);
  });

  it("los PDF nuevos se suben protegidos", () => {
    assert.equal(files.PDF_STORAGE.type, "authenticated");
    assert.equal(files.PDF_STORAGE.resource_type, "image");
  });

  it("una revista pública no lleva el identificador del PDF y conserva su portada propia si no hay PDF", () => {
    const publica = files.toPublicMagazine({ ...revista });
    assert.equal("pdf_public_id" in publica, false);
    assert.match(publica.portada_url, FIRMADA);
    assert.equal(files.toPublicMagazine({ titulo: "x", pdf_public_id: null, portada_url: "https://p/x.jpg" }).portada_url, "https://p/x.jpg");
    assert.equal(files.toPublicMagazine(null), null);
  });
});

describe("Respuestas de la API de revistas", () => {
  for (const [nombre, ruta, usuario, lista] of [
    ["catálogo", "/", null, (b) => b.data],
    ["filtro", "/filter?search=Salud", null, (b) => b.data],
    ["detalle", "/3", null, (b) => [b.data]],
    ["mis compras", "/my-purchases", COMPRADOR, (b) => b],
  ]) {
    it(`${nombre}: sin pdf_public_id y con portada firmada`, async () => {
      const { status, body } = await get(ruta, usuario);
      assert.equal(status, 200);
      assert.doesNotMatch(JSON.stringify(body), /pdf_public_id|\/upload\//);
      for (const m of lista(body)) assert.match(m.portada_url, FIRMADA);
    });
  }

  it("quien compró la revista recibe la dirección firmada del PDF", async () => {
    const { status, body } = await get("/secure-pdf/3", COMPRADOR);
    assert.equal(status, 200);
    assert.match(body.url, FIRMADA);
    assert.match(ruta(body.url), /\.pdf$/);
  });

  it("quien no la compró recibe 403 y ninguna dirección", async () => {
    const { status, body } = await get("/secure-pdf/3", 15);
    assert.equal(status, 403);
    assert.equal(body.url, undefined);
  });

  it("sin sesión no se entrega la dirección del PDF", async () => {
    const { status } = await get("/secure-pdf/3");
    assert.equal(status, 401);
  });
});

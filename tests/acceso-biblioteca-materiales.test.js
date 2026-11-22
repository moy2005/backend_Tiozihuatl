/**
 * Acceso a Biblioteca Digital y Materiales Complementarios (#216), sin base de datos real.
 * Monta los routers públicos reales con controladores simulados y comprueba quién recibe datos.
 * Ejecutar con: npm run test:acceso
 */
import { after, before, describe, it, mock } from "node:test";
import assert from "node:assert/strict";
import express from "express";

process.env.JWT_SECRET = process.env.JWT_SECRET || "secreto-de-prueba";

// Los tokens de prueba pertenecen a una sesión activa (el middleware la comprueba desde #217).
mock.module("../src/config/db.config.js", {
  namedExports: {
    poolPromise: {
      query: async (sql) => (/SELECT 1\s+FROM tokensrefresh/.test(sql) ? [[{ 1: 1 }]] : [[]]),
    },
  },
});

// Los controladores reales consultan la base de datos; aquí solo responden quién llegó.
const ok = (nombre) => (req, res) => res.status(200).json({ ok: nombre, rol: req.user?.rol ?? null });
mock.module("../src/modules/catalog/public/controllers/catalog.controller.js", {
  defaultExport: {
    getCatalog: ok("catalogo"),
    getMaterias: ok("materias"),
    getPdfUrl: ok("pdf-url"),
    preview: ok("preview"),
    getSemestres: ok("semestres"),
  },
});
mock.module("../src/modules/materiales/public/controllers/material.controller.js", {
  namedExports: {
    getMaterials: ok("materiales"),
    getMaterias: ok("materias"),
    getSemestres: ok("semestres"),
    getDocentes: ok("docentes"),
    getDocenteInfo: ok("docente"),
    getByDocente: ok("materiales-docente"),
    getAllWithDocente: ok("materiales-todos"),
    getMaterialRecommendations: ok("recomendaciones"),
  },
});

let server;
let base;
let JWTService;

before(async () => {
  const { default: catalogRoutes } = await import("../src/modules/catalog/public/routes/catalog.routes.js");
  const { default: materialRoutes } = await import("../src/modules/materiales/public/routes/material.routes.js");
  ({ JWTService } = await import("../src/core/services/jwt.service.js"));
  const app = express();
  app.use("/api/catalog", catalogRoutes);
  app.use("/api/material", materialRoutes);
  await new Promise((resolve) => { server = app.listen(0, resolve); });
  base = `http://127.0.0.1:${server.address().port}/api`;
});

after(() => server?.close());

const token = (rol) => JWTService.generateAccessToken({ id: 7, rol, correo: "prueba@correo.com" });

async function get(path, rol) {
  const headers = rol ? { Authorization: `Bearer ${token(rol)}` } : {};
  const res = await fetch(`${base}${path}`, { headers });
  return { status: res.status, body: await res.json() };
}

const PROTEGIDAS_BIBLIOTECA = ["/catalog", "/catalog?formato=DIGITAL", "/catalog/libros/52/pdf-url", "/catalog/libros/52/preview"];
const PROTEGIDAS_MATERIALES = [
  "/material/materiales/todos?semestre=1&page=1&limit=9",
  "/material",
  "/material/docentes",
  "/material/recomendaciones/3",
  "/material/docente/4/materiales",
];
const PUBLICAS = ["/catalog/materias", "/catalog/semestres", "/material/materias", "/material/semestres"];

describe("Biblioteca y Materiales exigen sesión de la comunidad institucional (#216)", () => {
  it("sin sesión responden 401 y no entregan datos", async () => {
    for (const path of [...PROTEGIDAS_BIBLIOTECA, ...PROTEGIDAS_MATERIALES]) {
      const { status, body } = await get(path);
      assert.equal(status, 401, path);
      assert.equal(body.ok, undefined, path);
    }
  });

  it("con un token alterado responden 401", async () => {
    const res = await fetch(`${base}/catalog`, { headers: { Authorization: "Bearer eyJhbGciOiJIUzI1NiJ9.eyJpZCI6N30.alterado" } });
    assert.equal(res.status, 401);
  });

  it("con la sesión de un Visitante responden 403", async () => {
    for (const path of [...PROTEGIDAS_BIBLIOTECA, ...PROTEGIDAS_MATERIALES]) {
      const { status, body } = await get(path, "Visitante");
      assert.equal(status, 403, path);
      assert.equal(body.ok, undefined, path);
    }
  });

  it("Estudiante y Docente reciben libros y materiales", async () => {
    for (const rol of ["Estudiante", "Docente"]) {
      for (const path of [...PROTEGIDAS_BIBLIOTECA, ...PROTEGIDAS_MATERIALES]) {
        const { status, body } = await get(path, rol);
        assert.equal(status, 200, `${rol} ${path}`);
        assert.equal(body.rol, rol);
      }
    }
  });

  it("los roles de la web conservan su acceso: Administrador a ambos y Bibliotecario a Biblioteca", async () => {
    for (const path of [...PROTEGIDAS_BIBLIOTECA, ...PROTEGIDAS_MATERIALES]) {
      assert.equal((await get(path, "Administrador")).status, 200, path);
    }
    for (const path of PROTEGIDAS_BIBLIOTECA) {
      assert.equal((await get(path, "Bibliotecario")).status, 200, path);
    }
  });

  it("materias y semestres siguen públicos para los filtros y el monitoreo", async () => {
    for (const path of PUBLICAS) {
      assert.equal((await get(path)).status, 200, path);
      assert.equal((await get(path, "Visitante")).status, 200, path);
    }
  });
});

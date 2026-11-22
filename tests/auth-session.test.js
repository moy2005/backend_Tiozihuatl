/**
 * Pruebas de la sesión en el middleware de autenticación (#217), sin base de datos real.
 * Ejecutar con: npm run test:auth
 */
import { before, beforeEach, describe, it, mock } from "node:test";
import assert from "node:assert/strict";

process.env.JWT_SECRET = process.env.JWT_SECRET || "secreto-de-prueba";

// Estado simulado de la tabla tokensrefresh: si el usuario tiene una sesión activa.
let activeSessions = new Set();
let failDatabase = false;
const queries = [];

mock.module("../src/config/db.config.js", {
  namedExports: {
    poolPromise: {
      query: async (sql, params = []) => {
        queries.push(sql);
        if (failDatabase) throw new Error("getaddrinfo ENOTFOUND mysql");
        if (/SELECT 1\s+FROM tokensrefresh/.test(sql)) {
          return [activeSessions.has(params[0]) ? [{ 1: 1 }] : []];
        }
        if (/UPDATE tokensrefresh\s+SET estado = 'Revocado'/.test(sql)) {
          activeSessions.delete(params[0]);
          return [{ affectedRows: 1 }];
        }
        return [{ affectedRows: 0 }];
      },
    },
  },
});

// Cierre de sesión: se registran las cuentas cuya sesión se cerró.
const closedSessions = [];
mock.module("../src/modules/auth/models/session.model.js", {
  namedExports: { SessionModel: { close: async (id) => { closedSessions.push(id); } } },
});
mock.module("../src/core/services/audit.service.js", {
  namedExports: { AuditService: { logEvent: async () => {} } },
});

let authMiddleware;
let AuthController;
let verifyAuth;
let RefreshModel;
let JWTService;

before(async () => {
  ({ authMiddleware, verifyAuth } = await import("../src/core/middleware/auth.middleware.js"));
  ({ RefreshModel } = await import("../src/modules/auth/models/refresh.model.js"));
  ({ JWTService } = await import("../src/core/services/jwt.service.js"));
  ({ AuthController } = await import("../src/modules/auth/controllers/auth.controller.js"));
});

/** Ejecuta el middleware y devuelve si llegó a next() y la respuesta enviada. */
async function run(middleware, token) {
  const req = { headers: token ? { authorization: `Bearer ${token}` } : {} };
  let status = 200;
  let body = null;
  const res = {
    status(code) { status = code; return this; },
    json(data) { body = data; return this; },
  };
  let nextCalled = false;
  await middleware(req, res, () => { nextCalled = true; });
  return { nextCalled, status, body, user: req.user };
}

describe("authMiddleware: el token solo sirve mientras la sesión está activa (#217)", () => {
  beforeEach(() => {
    activeSessions = new Set([5]);
    failDatabase = false;
    queries.length = 0;
  });

  it("con sesión activa deja pasar y conserva el usuario del token", async () => {
    const token = JWTService.generateAccessToken({ id: 5, rol: "Estudiante", correo: "a@b.com" });
    const result = await run(authMiddleware, token);
    assert.equal(result.nextCalled, true);
    assert.equal(result.user.id_usuario, 5);
  });

  it("después de cerrar sesión, el mismo token de acceso responde 401", async () => {
    const token = JWTService.generateAccessToken({ id: 5, rol: "Estudiante" });
    assert.equal((await run(authMiddleware, token)).nextCalled, true);

    await RefreshModel.revoke(5);

    const result = await run(authMiddleware, token);
    assert.equal(result.nextCalled, false);
    assert.equal(result.status, 401);
    assert.deepEqual(result.body, { error: "Sesion cerrada o expirada" });
  });

  it("un token de un usuario sin sesión activa (otro dispositivo cerró o inició sesión) responde 401", async () => {
    const token = JWTService.generateAccessToken({ id: 9, rol: "Docente" });
    const result = await run(authMiddleware, token);
    assert.equal(result.status, 401);
    assert.equal(result.nextCalled, false);
  });

  it("si la base de datos falla responde 503 sin detalles técnicos y no deja pasar", async () => {
    failDatabase = true;
    const token = JWTService.generateAccessToken({ id: 5, rol: "Estudiante" });
    const result = await run(authMiddleware, token);
    assert.equal(result.nextCalled, false);
    assert.equal(result.status, 503);
    assert.doesNotMatch(JSON.stringify(result.body), /ENOTFOUND|mysql/);
  });

  it("sin token o con un token alterado responde 401 sin consultar la sesión", async () => {
    assert.deepEqual((await run(authMiddleware)).body, { error: "Token no proporcionado" });
    const altered = await run(authMiddleware, "eyJhbGciOiJIUzI1NiJ9.eyJpZCI6NX0.firma-alterada");
    assert.equal(altered.status, 401);
    assert.deepEqual(altered.body, { error: "Token invalido o expirado" });
    assert.equal(queries.some((sql) => /SELECT 1\s+FROM tokensrefresh/.test(sql)), false);
  });

  it("verifyAuth aplica la misma regla de sesión", async () => {
    const token = JWTService.generateAccessToken({ id: 5, rol: "Estudiante" });
    assert.equal((await run(verifyAuth, token)).nextCalled, true);
    activeSessions.clear();
    const result = await run(verifyAuth, token);
    assert.equal(result.status, 401);
    assert.equal(result.nextCalled, false);
  });
});

describe("RefreshModel.hasActiveSession", () => {
  it("sin usuario no consulta la base de datos", async () => {
    queries.length = 0;
    assert.equal(await RefreshModel.hasActiveSession(undefined), false);
    assert.equal(queries.length, 0);
  });
});

describe("logout: solo cierra la sesión del dueño del token", () => {
  beforeEach(() => {
    activeSessions = new Set([5, 9]);
    failDatabase = false;
    closedSessions.length = 0;
  });

  async function logout(token, body = {}) {
    let status = 200;
    let response = null;
    const res = {
      status(code) { status = code; return this; },
      json(data) { response = data; return this; },
    };
    await AuthController.logout({ headers: { authorization: `Bearer ${token}` }, body, ip: "127.0.0.1" }, res);
    return { status, response };
  }

  it("ignora un id_usuario ajeno en el cuerpo y cierra solo la sesión propia", async () => {
    const token = JWTService.generateAccessToken({ id: 5, rol: "Visitante" });
    const result = await logout(token, { id_usuario: 9 });
    assert.equal(result.status, 200);
    assert.deepEqual(closedSessions, [5]);
    assert.equal(activeSessions.has(5), false);
    assert.equal(activeSessions.has(9), true);
  });

  it("con su propio id_usuario funciona igual que antes", async () => {
    const token = JWTService.generateAccessToken({ id: 5, rol: "Estudiante" });
    assert.equal((await logout(token, { id_usuario: 5 })).status, 200);
    assert.deepEqual(closedSessions, [5]);
  });
});

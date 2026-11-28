import { beforeEach, it, mock } from "node:test";
import assert from "node:assert/strict";

const queries = [];
mock.module("../src/config/db.config.js", {
  namedExports: {
    poolPromise: {
      query: async (sql, params) => {
        queries.push({ sql, params });
        if (sql.includes("COUNT(*)")) return [[{ total: 20 }]];
        return [[{ id_prestamo: 23 }]];
      },
    },
  },
});
const { PublicPrestamoController } = await import(
  "../src/modules/prestamos/public/controllers/public.prestamos.controller.js"
);

async function request(query) {
  const response = {
    code: 200,
    status(code) { this.code = code; return this; },
    json(body) { this.body = body; },
  };
  await PublicPrestamoController.obtenerMisPrestamos({ user: { id: 37 }, query }, response);
  return response;
}

beforeEach(() => { queries.length = 0; });

it("pagina el historial de un solo estudiante con un orden estable", async () => {
  const result = await request({ filtro: "historial", pagina: "2", limite: "9" });
  assert.equal(result.code, 200);
  assert.deepEqual(result.body, {
    success: true,
    data: [{ id_prestamo: 23 }],
    paginacion: { pagina: 2, limite: 9, total: 20, totalPaginas: 3 },
  });
  assert.match(queries[0].sql, /AND id_usuario = \?/);
  assert.deepEqual(queries[0].params, [37]);
  assert.deepEqual(queries[1].params, [37, "Devuelto", "Cancelado"]);
  assert.match(queries[2].sql, /ORDER BY p.fecha_prestamo DESC, p.id_prestamo DESC\s+LIMIT \? OFFSET \?/);
  assert.deepEqual(queries[2].params, [37, "Devuelto", "Cancelado", 9, 9]);
});

it("acota una página que excede el historial", async () => {
  const result = await request({ filtro: "activos", pagina: "99", limite: "9" });
  assert.equal(result.body.paginacion.pagina, 3);
  assert.deepEqual(queries[2].params, [37, "Activo", 9, 18]);
});

it("rechaza filtros y límites inválidos antes de consultar la base", async () => {
  assert.equal((await request({ filtro: "constructor", pagina: "1", limite: "9" })).code, 400);
  assert.equal((await request({ filtro: "activos", pagina: "1", limite: "31" })).code, 400);
  assert.deepEqual(queries, []);
});

it("mantiene la respuesta histórica de los clientes sin parámetros", async () => {
  const result = await request({});
  assert.deepEqual(result.body, { success: true, data: [{ id_prestamo: 23 }] });
  assert.deepEqual(queries[1].params, [37]);
  assert.doesNotMatch(queries[1].sql, /LIMIT/);
});

import { poolPromise } from "../../../config/db.config.js";

const LOCAL_NOW_SQL = "DATE_SUB(UTC_TIMESTAMP(), INTERVAL 6 HOUR)";
const VALID_ESTADOS = ["Borrador", "Publicado", "Finalizado", "Cancelado"];
const VALID_TIPOS = ["PRESENCIAL", "VIRTUAL"];

function normalizarEnum(valor, permitidos) {
  if (!valor) return null;
  return permitidos.includes(valor) ? valor : null;
}

function normalizarBooleano(valor) {
  if (valor === undefined || valor === null || valor === "") return null;
  if (["1", 1, true, "true"].includes(valor)) return 1;
  if (["0", 0, false, "false"].includes(valor)) return 0;
  return null;
}

function normalizarNumeroEntero(valor, maximo = null) {
  if (valor === undefined || valor === null || valor === "") return null;

  const numero = Number(valor);
  if (!Number.isInteger(numero) || numero <= 0) return null;

  if (maximo && numero > maximo) return maximo;
  return numero;
}

function construirFiltros(filters = {}, { isPublic = false } = {}) {
  const conditions = [];
  const params = [];

  const search = String(filters.search || "").trim();
  if (search) {
    const like = `%${search}%`;
    conditions.push(`
      (
        e.titulo LIKE ?
        OR e.descripcion LIKE ?
        OR COALESCE(e.ubicacion, '') LIKE ?
        OR COALESCE(e.enlace, '') LIKE ?
      )
    `);
    params.push(like, like, like, like);
  }

  const tipo = normalizarEnum(filters.tipo, VALID_TIPOS);
  if (tipo) {
    conditions.push("e.tipo = ?");
    params.push(tipo);
  }

  const destacado = normalizarBooleano(filters.destacado);
  if (destacado !== null) {
    conditions.push("e.destacado = ?");
    params.push(destacado);
  }

  const estado = normalizarEnum(filters.estado, VALID_ESTADOS);
  const vigencia = String(filters.vigencia || "").trim().toLowerCase();

  if (isPublic) {
    conditions.push("e.estado IN ('Publicado', 'Finalizado')");

    if (estado === "Publicado" || estado === "Finalizado") {
      conditions.push("e.estado = ?");
      params.push(estado);
    }
  } else if (estado) {
    conditions.push("e.estado = ?");
    params.push(estado);
  }

  if (vigencia === "proximos" || vigencia === "futuros") {
    conditions.push(`e.fecha_inicio > ${LOCAL_NOW_SQL}`);
  } else if (vigencia === "en_curso" || vigencia === "vigentes") {
    conditions.push(
      `e.fecha_inicio <= ${LOCAL_NOW_SQL} AND e.fecha_fin >= ${LOCAL_NOW_SQL}`
    );
  } else if (vigencia === "finalizados") {
    conditions.push(`e.fecha_fin < ${LOCAL_NOW_SQL}`);
  } else if (vigencia === "hoy") {
    conditions.push(`DATE(e.fecha_inicio) = DATE(${LOCAL_NOW_SQL})`);
  }

  if (filters.fecha_desde) {
    conditions.push("e.fecha_inicio >= ?");
    params.push(filters.fecha_desde);
  }

  if (filters.fecha_hasta) {
    conditions.push("e.fecha_inicio <= ?");
    params.push(filters.fecha_hasta);
  }

  const limit = normalizarNumeroEntero(filters.limit, 100);

  return {
    whereClause: conditions.length ? `WHERE ${conditions.join(" AND ")}` : "",
    params,
    limitClause: limit ? `LIMIT ${limit}` : "",
  };
}

export const EventsModel = {
  sincronizarEstados: async () => {
    await poolPromise.query(`
      UPDATE eventos
      SET estado = 'Finalizado',
          updated_at = CURRENT_TIMESTAMP
      WHERE estado != 'Cancelado'
        AND fecha_fin < ${LOCAL_NOW_SQL}
        AND estado != 'Finalizado'
    `);

    await poolPromise.query(`
      UPDATE eventos
      SET estado = 'Borrador',
          updated_at = CURRENT_TIMESTAMP
      WHERE estado != 'Cancelado'
        AND fecha_fin >= ${LOCAL_NOW_SQL}
        AND fecha_inicio > ${LOCAL_NOW_SQL}
        AND estado != 'Borrador'
    `);

    await poolPromise.query(`
      UPDATE eventos
      SET estado = 'Publicado',
          updated_at = CURRENT_TIMESTAMP
      WHERE estado != 'Cancelado'
        AND fecha_fin >= ${LOCAL_NOW_SQL}
        AND fecha_inicio <= ${LOCAL_NOW_SQL}
        AND estado != 'Publicado'
    `);
  },

  create: async (data) => {
    const {
      titulo,
      descripcion,
      tipo,
      ubicacion,
      enlace,
      fecha_inicio,
      fecha_fin,
      estado,
      destacado,
    } = data;

    const [result] = await poolPromise.query(
      `INSERT INTO eventos
      (
        titulo,
        descripcion,
        tipo,
        ubicacion,
        enlace,
        fecha_inicio,
        fecha_fin,
        estado,
        destacado
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        titulo,
        descripcion,
        tipo,
        ubicacion || null,
        enlace || null,
        fecha_inicio,
        fecha_fin,
        estado,
        destacado || 0,
      ]
    );

    return result.insertId;
  },

  update: async (id, data) => {
    const {
      titulo,
      descripcion,
      tipo,
      ubicacion,
      enlace,
      fecha_inicio,
      fecha_fin,
      estado,
      destacado,
    } = data;

    await poolPromise.query(
      `UPDATE eventos SET
        titulo = ?,
        descripcion = ?,
        tipo = ?,
        ubicacion = ?,
        enlace = ?,
        fecha_inicio = ?,
        fecha_fin = ?,
        estado = ?,
        destacado = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id_evento = ?`,
      [
        titulo,
        descripcion,
        tipo,
        ubicacion || null,
        enlace || null,
        fecha_inicio,
        fecha_fin,
        estado,
        destacado || 0,
        id,
      ]
    );
  },

  delete: async (id) => {
    await poolPromise.query("DELETE FROM eventos WHERE id_evento = ?", [id]);
  },

  getById: async (id) => {
    const [rows] = await poolPromise.query(
      "SELECT * FROM eventos WHERE id_evento = ?",
      [id]
    );
    return rows[0];
  },

  updateDestacado: async (id, destacado) => {
    await poolPromise.query(
      `UPDATE eventos
       SET destacado = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id_evento = ?`,
      [destacado ? 1 : 0, id]
    );
  },

  getAllAdmin: async (filters = {}) => {
    await EventsModel.sincronizarEstados();

    const { whereClause, params, limitClause } = construirFiltros(filters);

    const [rows] = await poolPromise.query(
      `
      SELECT
        e.*,
        (
          SELECT COUNT(*)
          FROM evento_imagenes ei
          WHERE ei.id_evento = e.id_evento
        ) AS total_imagenes,
        (
          SELECT ei.url
          FROM evento_imagenes ei
          WHERE ei.id_evento = e.id_evento
          ORDER BY ei.orden ASC, ei.id_imagen ASC
          LIMIT 1
        ) AS imagen_principal
      FROM eventos e
      ${whereClause}
      ORDER BY e.destacado DESC, e.fecha_inicio DESC, e.id_evento DESC
      ${limitClause}
      `,
      params
    );

    return rows;
  },

  getPublic: async (filters = {}) => {
    await EventsModel.sincronizarEstados();

    const { whereClause, params, limitClause } = construirFiltros(filters, {
      isPublic: true,
    });

    const [rows] = await poolPromise.query(
      `
      SELECT
        e.*,
        (
          SELECT ei.url
          FROM evento_imagenes ei
          WHERE ei.id_evento = e.id_evento
          ORDER BY ei.orden ASC, ei.id_imagen ASC
          LIMIT 1
        ) AS imagen_principal
      FROM eventos e
      ${whereClause}
      ORDER BY e.destacado DESC, e.fecha_inicio ASC, e.id_evento DESC
      ${limitClause}
      `,
      params
    );

    return rows;
  },

  getPublicById: async (id) => {
    await EventsModel.sincronizarEstados();

    const [rows] = await poolPromise.query(
      `
      SELECT
        e.*,
        (
          SELECT ei.url
          FROM evento_imagenes ei
          WHERE ei.id_evento = e.id_evento
          ORDER BY ei.orden ASC, ei.id_imagen ASC
          LIMIT 1
        ) AS imagen_principal
      FROM eventos e
      WHERE e.id_evento = ?
        AND e.estado IN ('Publicado', 'Finalizado')
      LIMIT 1
      `,
      [id]
    );

    return rows[0] || null;
  },
};

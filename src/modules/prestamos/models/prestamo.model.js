import { poolPromise } from "../../../config/db.config.js";
import { LOCAL_NOW_SQL } from "../utils/prestamo.datetime.js";

const PRESTAMO_SELECT = `
  SELECT
    p.id_prestamo,
    p.id_usuario,
    p.libro_id,
    DATE_FORMAT(p.fecha_prestamo, '%Y-%m-%dT%H:%i:%s') AS fecha_prestamo,
    DATE_FORMAT(p.fecha_vencimiento, '%Y-%m-%dT%H:%i:%s') AS fecha_vencimiento,
    CASE
      WHEN p.fecha_devolucion IS NULL THEN NULL
      ELSE DATE_FORMAT(p.fecha_devolucion, '%Y-%m-%dT%H:%i:%s')
    END AS fecha_devolucion,
    p.estado,
    p.gestionado_por,
    p.observaciones,
    CONCAT_WS(' ', u.nombre, u.a_paterno, u.a_materno) AS nombre_estudiante,
    u.nombre,
    u.a_paterno,
    u.a_materno,
    u.matricula,
    u.estado AS estado_usuario,
    c.nombre_carrera AS carrera,
    s.nombre_semestre AS semestre,
    COALESCE(ta.grupo, u.grupo) AS grupo,
    l.titulo,
    COALESCE(editoriales.nombre, 'Sin editorial') AS editorial,
    COALESCE(autores.autores, '') AS autores,
    stock.stock_total,
    stock.stock_disponible,
    CONCAT_WS(' ', admin.nombre, admin.a_paterno, admin.a_materno) AS gestionado_por_nombre
  FROM prestamos p
  INNER JOIN usuarios u ON u.id_usuario = p.id_usuario
  INNER JOIN libros l ON l.id = p.libro_id
  LEFT JOIN carreras c ON c.id_carrera = u.id_carrera
  LEFT JOIN (
    SELECT
      ta1.id_usuario,
      ta1.id_semestre,
      ta1.grupo
    FROM trayectoria_academica ta1
    INNER JOIN (
      SELECT id_usuario, MAX(id) AS max_id
      FROM trayectoria_academica
      GROUP BY id_usuario
    ) ultimo ON ultimo.max_id = ta1.id
  ) ta ON ta.id_usuario = u.id_usuario
  LEFT JOIN semestres s ON s.id_semestre = COALESCE(ta.id_semestre, u.id_semestre)
  LEFT JOIN editoriales ON editoriales.id_editorial = l.id_editorial
  LEFT JOIN (
    SELECT
      la.libro_id,
      GROUP_CONCAT(DISTINCT a.nombre ORDER BY a.nombre SEPARATOR '; ') AS autores
    FROM libro_autor la
    INNER JOIN autores a ON a.id = la.autor_id
    GROUP BY la.libro_id
  ) autores ON autores.libro_id = l.id
  LEFT JOIN (
    SELECT
      libro_id,
      MAX(total) AS stock_total,
      MAX(disponibles) AS stock_disponible
    FROM libro_formatos
    WHERE tipo = 'FISICO'
    GROUP BY libro_id
  ) stock ON stock.libro_id = l.id
  LEFT JOIN usuarios admin ON admin.id_usuario = p.gestionado_por
`;

const PENDING_STATES = ["Activo", "Vencido"];

const buildObservacionesValue = (observaciones, fallback = null) => {
  if (observaciones === undefined) {
    return fallback;
  }

  const normalized = String(observaciones ?? "").trim();
  return normalized === "" ? null : normalized;
};

export const PrestamoModel = {
  sincronizarVencidos: async (executor = poolPromise) => {
    await executor.query(
      `
        UPDATE prestamos
        SET estado = 'Vencido'
        WHERE estado = 'Activo'
          AND fecha_vencimiento <= ${LOCAL_NOW_SQL}
      `
    );
  },

  listarAdmin: async () => {
    const [rows] = await poolPromise.query(
      `
        ${PRESTAMO_SELECT}
        ORDER BY p.fecha_prestamo DESC, p.id_prestamo DESC
      `
    );

    return rows;
  },

  obtenerPorUsuario: async (usuario_id) => {
    const [rows] = await poolPromise.query(
      `
        SELECT
          p.id_prestamo,
          p.id_usuario,
          p.libro_id,
          DATE_FORMAT(p.fecha_prestamo, '%Y-%m-%dT%H:%i:%s') AS fecha_prestamo,
          DATE_FORMAT(p.fecha_vencimiento, '%Y-%m-%dT%H:%i:%s') AS fecha_vencimiento,
          CASE
            WHEN p.fecha_devolucion IS NULL THEN NULL
            ELSE DATE_FORMAT(p.fecha_devolucion, '%Y-%m-%dT%H:%i:%s')
          END AS fecha_devolucion,
          p.estado,
          p.gestionado_por,
          p.observaciones,
          l.titulo,
          COALESCE(editoriales.nombre, 'Sin editorial') AS editorial,
          lf.pdf_url
        FROM prestamos p
        INNER JOIN libros l ON l.id = p.libro_id
        LEFT JOIN editoriales ON editoriales.id_editorial = l.id_editorial
        LEFT JOIN libro_formatos lf
          ON lf.libro_id = l.id
         AND lf.tipo = 'DIGITAL'
        WHERE p.id_usuario = ?
        ORDER BY p.fecha_prestamo DESC, p.id_prestamo DESC
      `,
      [usuario_id]
    );

    return rows;
  },

  obtenerPrestamoPorId: async (conn, id_prestamo) => {
    const [rows] = await conn.query(
      `
        SELECT
          p.id_prestamo,
          p.id_usuario,
          p.libro_id,
          p.estado,
          p.observaciones,
          p.fecha_prestamo,
          p.fecha_vencimiento,
          p.fecha_devolucion
        FROM prestamos p
        WHERE p.id_prestamo = ?
        FOR UPDATE
      `,
      [id_prestamo]
    );

    return rows[0] || null;
  },

  validarUsuarioPrestamo: async (conn, id_usuario) => {
    const [rows] = await conn.query(
      `
        SELECT
          u.id_usuario,
          u.estado,
          u.matricula,
          CONCAT_WS(' ', u.nombre, u.a_paterno, u.a_materno) AS nombre_estudiante,
          r.nombre_rol
        FROM usuarios u
        INNER JOIN roles r ON r.id_rol = u.id_rol
        WHERE u.id_usuario = ?
        LIMIT 1
      `,
      [id_usuario]
    );

    return rows[0] || null;
  },

  validarLibroPrestamo: async (conn, libro_id) => {
    const [rows] = await conn.query(
      `
        SELECT
          l.id,
          l.activo,
          l.titulo,
          lf.total,
          lf.disponibles
        FROM libros l
        INNER JOIN libro_formatos lf
          ON lf.libro_id = l.id
         AND lf.tipo = 'FISICO'
        WHERE l.id = ?
        LIMIT 1
      `,
      [libro_id]
    );

    return rows[0] || null;
  },

  contarPrestamosPendientes: async (conn, usuario_id, excludePrestamoId = null) => {
    const params = [usuario_id, ...PENDING_STATES];
    let query = `
      SELECT COUNT(*) AS total
      FROM prestamos
      WHERE id_usuario = ?
        AND estado IN (?, ?)
    `;

    if (excludePrestamoId !== null && excludePrestamoId !== undefined) {
      query += " AND id_prestamo <> ?";
      params.push(excludePrestamoId);
    }

    const [rows] = await conn.query(query, params);
    return Number(rows[0]?.total || 0);
  },

  descontarStock: async (conn, libro_id) => {
    const [result] = await conn.query(
      `
        UPDATE libro_formatos
        SET disponibles = disponibles - 1
        WHERE libro_id = ?
          AND tipo = 'FISICO'
          AND disponibles > 0
      `,
      [libro_id]
    );

    if (result.affectedRows === 0) {
      throw new Error("No hay stock disponible");
    }
  },

  incrementarStock: async (conn, libro_id) => {
    await conn.query(
      `
        UPDATE libro_formatos
        SET disponibles = disponibles + 1
        WHERE libro_id = ?
          AND tipo = 'FISICO'
      `,
      [libro_id]
    );
  },

  crearPrestamo: async (conn, data) => {
    const [result] = await conn.query(
      `
        INSERT INTO prestamos
          (
            id_usuario,
            libro_id,
            fecha_prestamo,
            fecha_vencimiento,
            estado,
            gestionado_por,
            observaciones
          )
        VALUES (?, ?, ?, ?, 'Activo', ?, ?)
      `,
      [
        data.id_usuario,
        data.libro_id,
        data.fecha_prestamo,
        data.fecha_vencimiento,
        data.admin_id ?? null,
        buildObservacionesValue(data.observaciones),
      ]
    );

    return result.insertId;
  },

  actualizarPrestamo: async (conn, id_prestamo, data) => {
    await conn.query(
      `
        UPDATE prestamos
        SET id_usuario = ?,
            libro_id = ?,
            observaciones = ?,
            gestionado_por = ?
        WHERE id_prestamo = ?
      `,
      [
        data.id_usuario,
        data.libro_id,
        buildObservacionesValue(data.observaciones),
        data.admin_id ?? null,
        id_prestamo,
      ]
    );
  },

  devolverLibro: async (conn, id_prestamo, admin_id, observaciones, fechaDevolucion) => {
    await conn.query(
      `
        UPDATE prestamos
        SET estado = 'Devuelto',
            fecha_devolucion = ?,
            gestionado_por = ?,
            observaciones = ?
        WHERE id_prestamo = ?
      `,
      [
        fechaDevolucion,
        admin_id,
        buildObservacionesValue(observaciones),
        id_prestamo,
      ]
    );
  },

  cancelarPrestamo: async (conn, id_prestamo, admin_id, observaciones) => {
    await conn.query(
      `
        UPDATE prestamos
        SET estado = 'Cancelado',
            gestionado_por = ?,
            observaciones = ?
        WHERE id_prestamo = ?
      `,
      [admin_id, buildObservacionesValue(observaciones), id_prestamo]
    );
  },

  marcarVencido: async (conn, id_prestamo, admin_id, observaciones) => {
    await conn.query(
      `
        UPDATE prestamos
        SET estado = 'Vencido',
            gestionado_por = ?,
            observaciones = ?
        WHERE id_prestamo = ?
      `,
      [admin_id, buildObservacionesValue(observaciones), id_prestamo]
    );
  },

  activarPrestamo: async (conn, id_prestamo, data) => {
    await conn.query(
      `
        UPDATE prestamos
        SET estado = 'Activo',
            fecha_prestamo = ?,
            fecha_vencimiento = ?,
            fecha_devolucion = NULL,
            gestionado_por = ?,
            observaciones = ?
        WHERE id_prestamo = ?
      `,
      [
        data.fecha_prestamo,
        data.fecha_vencimiento,
        data.admin_id ?? null,
        buildObservacionesValue(data.observaciones),
        id_prestamo,
      ]
    );
  },

  eliminarPrestamo: async (conn, id_prestamo) => {
    await conn.query(
      `
        DELETE FROM prestamos
        WHERE id_prestamo = ?
      `,
      [id_prestamo]
    );
  },

  actualizarObservaciones: async (id_prestamo, observaciones) => {
    await poolPromise.execute(
      `
        UPDATE prestamos
        SET observaciones = ?
        WHERE id_prestamo = ?
      `,
      [buildObservacionesValue(observaciones), id_prestamo]
    );
  },
};

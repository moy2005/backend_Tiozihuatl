import { poolPromise } from "../../../config/db.config.js";

/**
 * Nota sobre periodos académicos:
 *   FEB-JUL  →  meses 2 al 7   (orden 1)
 *   AGO-ENE  →  meses 8 al 1   (orden 2)
 */

// ─────────────────────────────────────────────────────────────────────────────
// FIG 2 — Lista de préstamos con detalle completo.
// Joins: prestamos → usuarios → libros → libro_materia → materias
// ─────────────────────────────────────────────────────────────────────────────
export const getPrestamosDetalle = async () => {
  const conn = await poolPromise.getConnection();
  try {
    const [rows] = await conn.execute(`
      SELECT
        p.id_prestamo,
        u.matricula,
        CONCAT_WS(' ', u.nombre, u.a_paterno, u.a_materno)      AS alumno,
        l.titulo                                                 AS libro,
        GROUP_CONCAT(m.nombre ORDER BY m.nombre SEPARATOR ', ') AS materias,
        p.fecha_prestamo,
        p.fecha_vencimiento,
        p.fecha_devolucion,
        p.estado,
        p.observaciones
      FROM prestamos          p
      JOIN  usuarios          u  ON p.id_usuario  = u.id_usuario
      JOIN  libros            l  ON p.libro_id    = l.id
      LEFT JOIN libro_materia lm ON l.id          = lm.libro_id
      LEFT JOIN materias      m  ON lm.materia_id = m.id
      GROUP BY
        p.id_prestamo,
        u.matricula,
        u.nombre, u.a_paterno, u.a_materno,
        l.titulo,
        p.fecha_prestamo, p.fecha_vencimiento,
        p.fecha_devolucion, p.estado, p.observaciones
      ORDER BY p.fecha_prestamo DESC
    `);
    return rows;
  } finally {
    conn.release();
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// FIG 3 — Préstamos agrupados por periodo académico con desglose por materia.
// Una sola query que devuelve el cruce periodo × materia.
// El servicio agrupa las filas bajo su periodo para formar la estructura
// jerárquica: periodo → [ { materia, total } ]
// Limitado a los últimos 6 periodos en orden cronológico ascendente.
// ─────────────────────────────────────────────────────────────────────────────
export const getPrestamosAgrupadosPorPeriodoYMateria = async () => {
  const conn = await poolPromise.getConnection();
  try {
    const [rows] = await conn.execute(`
      SELECT
        YEAR(p.fecha_prestamo) AS year,
        CASE
          WHEN MONTH(p.fecha_prestamo) BETWEEN 2 AND 7 THEN 'FEB-JUL'
          ELSE 'AGO-ENE'
        END AS periodo,
        CASE
          WHEN MONTH(p.fecha_prestamo) BETWEEN 2 AND 7 THEN 1
          ELSE 2
        END AS orden_periodo,
        m.nombre AS materia,
        COUNT(*)  AS total_materia
      FROM prestamos          p
      JOIN  libro_materia     lm ON p.libro_id    = lm.libro_id
      JOIN  materias          m  ON lm.materia_id = m.id
      WHERE CONCAT(
              YEAR(p.fecha_prestamo), '-',
              LPAD(CASE WHEN MONTH(p.fecha_prestamo) BETWEEN 2 AND 7 THEN 1 ELSE 2 END, 2, '0')
            )
        IN (
          SELECT CONCAT(year, '-', LPAD(orden_periodo, 2, '0'))
          FROM (
            SELECT
              YEAR(fecha_prestamo) AS year,
              CASE
                WHEN MONTH(fecha_prestamo) BETWEEN 2 AND 7 THEN 1
                ELSE 2
              END AS orden_periodo
            FROM prestamos
            GROUP BY year, orden_periodo
            ORDER BY year DESC, orden_periodo DESC
            LIMIT 6
          ) ultimos
        )
      GROUP BY year, periodo, orden_periodo, m.nombre
      ORDER BY year ASC, orden_periodo ASC, total_materia DESC
    `);
    return rows;
  } finally {
    conn.release();
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// FIG 4 / FIG 5 / FIG 6 — Histórico de préstamos por periodo académico.
// Últimos 6 periodos en orden cronológico ascendente.
// Base para el cálculo del modelo exponencial P(p) = C · e^(kp).
// ─────────────────────────────────────────────────────────────────────────────
export const getLoansByPeriod = async () => {
  const conn = await poolPromise.getConnection();
  try {
    const [rows] = await conn.execute(`
      SELECT year, periodo, orden_periodo, total
      FROM (
        SELECT
          YEAR(fecha_prestamo) AS year,
          CASE
            WHEN MONTH(fecha_prestamo) BETWEEN 2 AND 7 THEN 'FEB-JUL'
            ELSE 'AGO-ENE'
          END AS periodo,
          CASE
            WHEN MONTH(fecha_prestamo) BETWEEN 2 AND 7 THEN 1
            ELSE 2
          END AS orden_periodo,
          COUNT(*) AS total
        FROM prestamos
        GROUP BY year, periodo, orden_periodo
        ORDER BY year DESC, orden_periodo DESC
        LIMIT 6
      ) sub
      ORDER BY year ASC, orden_periodo ASC
    `);
    return rows;
  } finally {
    conn.release();
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// FIG 5 — Histórico cruzado: préstamos por materia dentro de cada periodo.
// Permite ver cuántos préstamos hubo en cada materia por intervalo escolar.
// ─────────────────────────────────────────────────────────────────────────────
export const getHistoricoMateriasPeriodo = async () => {
  const conn = await poolPromise.getConnection();
  try {
    const [rows] = await conn.execute(`
      SELECT
        m.nombre AS materia,
        YEAR(p.fecha_prestamo) AS year,
        CASE
          WHEN MONTH(p.fecha_prestamo) BETWEEN 2 AND 7 THEN 'FEB-JUL'
          ELSE 'AGO-ENE'
        END AS periodo,
        CASE
          WHEN MONTH(p.fecha_prestamo) BETWEEN 2 AND 7 THEN 1
          ELSE 2
        END AS orden_periodo,
        COUNT(*) AS total
      FROM prestamos          p
      JOIN  libro_materia     lm ON p.libro_id    = lm.libro_id
      JOIN  materias          m  ON lm.materia_id = m.id
      GROUP BY m.nombre, year, periodo, orden_periodo
      ORDER BY year ASC, orden_periodo ASC, total DESC
    `);
    return rows;
  } finally {
    conn.release();
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// FIG 7 — Total histórico por materia.
// Usado para calcular el porcentaje de participación de cada área académica
// y distribuir las predicciones del modelo exponencial entre materias.
// ─────────────────────────────────────────────────────────────────────────────
export const getLoansBySubject = async () => {
  const conn = await poolPromise.getConnection();
  try {
    const [rows] = await conn.execute(`
      SELECT
        m.nombre AS materia,
        COUNT(*)  AS total
      FROM prestamos          p
      JOIN  libro_materia     lm ON p.libro_id    = lm.libro_id
      JOIN  materias          m  ON lm.materia_id = m.id
      GROUP BY m.nombre
      ORDER BY total DESC
    `);
    return rows;
  } finally {
    conn.release();
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// FIG 7 — Listado de materias con al menos un préstamo registrado.
// Usado para poblar el selector de materias en el frontend.
// ─────────────────────────────────────────────────────────────────────────────
export const getMateriasDisponibles = async () => {
  const conn = await poolPromise.getConnection();
  try {
    const [rows] = await conn.execute(`
      SELECT DISTINCT m.id, m.nombre AS materia
      FROM materias           m
      JOIN  libro_materia     lm ON m.id          = lm.materia_id
      JOIN  libros            l  ON lm.libro_id   = l.id
      JOIN  prestamos         p  ON p.libro_id    = l.id
      WHERE m.activo = 1
      ORDER BY m.nombre ASC
    `);
    return rows;
  } finally {
    conn.release();
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// FIG 7 — Préstamos de una materia específica con detalle por periodo.
// @param {string} nombreMateria  Nombre exacto (columna materias.nombre)
// ─────────────────────────────────────────────────────────────────────────────
export const getPrestamosDeMateria = async (nombreMateria) => {
  const conn = await poolPromise.getConnection();
  try {
    const [rows] = await conn.execute(`
      SELECT
        p.id_prestamo,
        u.matricula,
        CONCAT_WS(' ', u.nombre, u.a_paterno, u.a_materno) AS alumno,
        l.titulo AS libro,
        m.nombre AS materia,
        YEAR(p.fecha_prestamo) AS year,
        CASE
          WHEN MONTH(p.fecha_prestamo) BETWEEN 2 AND 7 THEN 'FEB-JUL'
          ELSE 'AGO-ENE'
        END AS periodo,
        p.fecha_prestamo,
        p.fecha_vencimiento,
        p.fecha_devolucion,
        p.estado
      FROM prestamos          p
      JOIN  usuarios          u  ON p.id_usuario  = u.id_usuario
      JOIN  libros            l  ON p.libro_id    = l.id
      JOIN  libro_materia     lm ON l.id          = lm.libro_id
      JOIN  materias          m  ON lm.materia_id = m.id
      WHERE m.nombre = ?
      ORDER BY p.fecha_prestamo DESC
    `, [nombreMateria]);
    return rows;
  } finally {
    conn.release();
  }
};
import { poolPromise } from "../../../config/db.config.js";

const LOCAL_NOW_SQL = "DATE_SUB(UTC_TIMESTAMP(), INTERVAL 6 HOUR)";

const clampLimit = (limit, fallback = 5, max = 12) => {
  const value = Number(limit);
  if (!Number.isInteger(value) || value <= 0) return fallback;
  return Math.min(value, max);
};

const compact = (value, max = 500) => {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  return text.length > max ? `${text.slice(0, max).trim()}...` : text;
};

const shouldIgnoreDbError = (error) =>
  ["ER_NO_SUCH_TABLE", "ER_BAD_FIELD_ERROR", "ER_PARSE_ERROR"].includes(error?.code);

const safeQuery = async (query, params = [], fallback = []) => {
  try {
    const [rows] = await poolPromise.query(query, params);
    return rows;
  } catch (error) {
    if (!shouldIgnoreDbError(error)) {
      console.warn("[assistant] Consulta dinamica omitida:", error.message);
    }
    return fallback;
  }
};

/**
 * Búsqueda por palabras (consultas parametrizadas).
 * 1) Cada palabra debe aparecer en alguno de los campos.
 * 2) Si no hay resultados y hay varias palabras, basta con alguna y se ordena
 *    por cuántas coinciden.
 * `run(where, params, relevance)` ejecuta la consulta concreta de cada tabla.
 */
const searchByWords = async (terms, fields, excludeIds, idField, run) => {
  const words = (Array.isArray(terms) ? terms : [terms])
    .map((term) => compact(term, 40))
    .filter(Boolean)
    .slice(0, 5);
  const exclude = (excludeIds || []).map(Number).filter(Number.isInteger).slice(0, 60);
  const excludeSql = exclude.length ? `AND ${idField} NOT IN (${exclude.map(() => "?").join(", ")})` : "";

  if (!words.length) return run(excludeSql, exclude, "");

  const wordCondition = `(${fields.map((field) => `${field} LIKE ?`).join(" OR ")})`;
  const wordParams = (word) => fields.map(() => `%${word}%`);

  const all = await run(
    `AND ${words.map(() => wordCondition).join(" AND ")} ${excludeSql}`,
    [...words.flatMap(wordParams), ...exclude],
    ""
  );
  if (all.length || words.length === 1) return all;

  const relevance = `${words.map(() => `(CASE WHEN ${wordCondition} THEN 1 ELSE 0 END)`).join(" + ")} DESC,`;
  return run(
    `AND (${words.map(() => wordCondition).join(" OR ")}) ${excludeSql}`,
    [...words.flatMap(wordParams), ...exclude, ...words.flatMap(wordParams)],
    relevance
  );
};

export const AssistantModel = {
  async getFaqs() {
    return safeQuery(
      `SELECT id_faq, pregunta, respuesta
       FROM ayuda_faq
       WHERE estado = 'Activo'
       ORDER BY fecha_creacion ASC
       LIMIT 50`
    );
  },

  async getAbout() {
    return safeQuery(
      `SELECT id_about, type, title, content
       FROM about
       WHERE status = 'Activo'
       ORDER BY id_about ASC
       LIMIT 8`
    );
  },

  async getCalendars() {
    return safeQuery(
      `SELECT id, titulo, titulo_seccion, archivo_url, tipo_calendario, tipo_archivo
       FROM calendarios
       WHERE activo = 1
       ORDER BY tipo_calendario ASC`
    );
  },

  /**
   * Términos para corregir erratas: títulos, materias y autores reales.
   * Se consulta poco (el servicio lo guarda en caché).
   */
  async getVocabularyTerms() {
    const [books, subjects, authors, materials] = await Promise.all([
      safeQuery("SELECT titulo AS term FROM libros WHERE activo = 1 LIMIT 3000"),
      safeQuery("SELECT nombre AS term FROM materias LIMIT 1000"),
      safeQuery("SELECT nombre AS term FROM autores LIMIT 3000"),
      safeQuery("SELECT titulo AS term FROM materiales WHERE activo = 1 AND visibilidad = 'PUBLICO' LIMIT 2000"),
    ]);
    return [...books, ...subjects, ...authors, ...materials].map((row) => row.term).filter(Boolean);
  },

  async searchBooks(terms = [], { limit = 4, excludeIds = [] } = {}) {
    const safeLimit = clampLimit(limit, 4, 8);
    const fields = [
      "l.titulo",
      "(SELECT GROUP_CONCAT(a2.nombre) FROM libro_autor la2 JOIN autores a2 ON a2.id = la2.autor_id WHERE la2.libro_id = l.id)",
      "(SELECT GROUP_CONCAT(m2.nombre) FROM libro_materia lm2 JOIN materias m2 ON m2.id = lm2.materia_id WHERE lm2.libro_id = l.id)",
    ];

    return searchByWords(terms, fields, excludeIds, "l.id", (where, params, relevance) =>
      safeQuery(
        `SELECT
            l.id,
            l.titulo,
            GROUP_CONCAT(DISTINCT a.nombre SEPARATOR '; ') AS autores,
            GROUP_CONCAT(DISTINCT m.nombre SEPARATOR ', ') AS materias,
            MAX(CASE WHEN f.tipo = 'FISICO' THEN f.disponibles END) AS disponibles,
            MAX(CASE WHEN f.tipo = 'DIGITAL' THEN 1 ELSE 0 END) AS tiene_digital,
            MAX(CASE WHEN f.tipo = 'FISICO' THEN 1 ELSE 0 END) AS tiene_fisico
         FROM libros l
         LEFT JOIN libro_autor la ON la.libro_id = l.id
         LEFT JOIN autores a ON a.id = la.autor_id
         LEFT JOIN libro_materia lm ON lm.libro_id = l.id
         LEFT JOIN materias m ON m.id = lm.materia_id
         LEFT JOIN libro_formatos f ON f.libro_id = l.id
         WHERE l.activo = 1 ${where}
         GROUP BY l.id, l.titulo
         ORDER BY ${relevance} l.titulo ASC
         LIMIT ${safeLimit}`,
        params
      )
    );
  },

  async searchNews(terms = [], { limit = 3, excludeIds = [] } = {}) {
    const safeLimit = clampLimit(limit, 3, 6);
    return searchByWords(terms, ["titulo", "contenido", "COALESCE(categoria, '')"], excludeIds, "id_noticia", (where, params, relevance) =>
      safeQuery(
        `SELECT id_noticia, titulo, contenido, categoria, fecha_publicacion
         FROM noticias
         WHERE estado = 'Publicada'
           AND fecha_publicacion <= ${LOCAL_NOW_SQL}
           AND (fecha_caducidad IS NULL OR fecha_caducidad > ${LOCAL_NOW_SQL})
           ${where}
         ORDER BY ${relevance} fecha_publicacion DESC
         LIMIT ${safeLimit}`,
        params
      )
    );
  },

  /** Eventos publicados; primero los próximos (más cercanos), después los finalizados. */
  async searchEvents(terms = [], { limit = 3, excludeIds = [] } = {}) {
    const safeLimit = clampLimit(limit, 3, 6);
    return searchByWords(
      terms,
      ["e.titulo", "e.descripcion", "COALESCE(e.ubicacion, '')"],
      excludeIds,
      "e.id_evento",
      (where, params, relevance) =>
        safeQuery(
          `SELECT e.id_evento, e.titulo, e.descripcion, e.tipo, e.ubicacion, e.enlace,
                  e.fecha_inicio, e.fecha_fin, e.estado, e.destacado
           FROM eventos e
           WHERE e.estado IN ('Publicado', 'Finalizado') ${where}
           ORDER BY ${relevance}
             CASE WHEN e.estado = 'Publicado' THEN 0 ELSE 1 END,
             CASE WHEN e.estado = 'Publicado' THEN e.fecha_inicio END ASC,
             e.fecha_inicio DESC
           LIMIT ${safeLimit}`,
          params
        )
    );
  },

  async searchMagazines(terms = [], { limit = 3, excludeIds = [] } = {}) {
    const safeLimit = clampLimit(limit, 3, 6);
    return searchByWords(terms, ["titulo", "COALESCE(descripcion, '')"], excludeIds, "id_revista", (where, params, relevance) =>
      safeQuery(
        `SELECT id_revista, titulo, descripcion, precio, stock
         FROM revistas
         WHERE estado = 'Activa' AND stock > 0 ${where}
         ORDER BY ${relevance} created_at DESC
         LIMIT ${safeLimit}`,
        params
      )
    );
  },

  async searchMaterials(terms = [], { limit = 4, excludeIds = [] } = {}) {
    const safeLimit = clampLimit(limit, 4, 6);
    const fields = [
      "m.titulo",
      "COALESCE(m.descripcion, '')",
      "CONCAT_WS(' ', u.nombre, u.a_paterno)",
      "(SELECT GROUP_CONCAT(mt2.nombre) FROM material_materia mm2 JOIN materias mt2 ON mt2.id = mm2.id_materia WHERE mm2.id_material = m.id_material)",
    ];
    return searchByWords(terms, fields, excludeIds, "m.id_material", (where, params, relevance) =>
      safeQuery(
        `SELECT
            m.id_material,
            m.titulo,
            m.descripcion,
            m.tipo,
            CONCAT_WS(' ', u.nombre, u.a_paterno) AS nombre_docente,
            GROUP_CONCAT(DISTINCT mat.nombre SEPARATOR ', ') AS materias
         FROM materiales m
         JOIN usuarios u ON m.id_usuario = u.id_usuario
         LEFT JOIN material_materia mm ON m.id_material = mm.id_material
         LEFT JOIN materias mat ON mm.id_materia = mat.id
         WHERE m.activo = 1 AND m.visibilidad = 'PUBLICO' ${where}
         GROUP BY m.id_material, m.titulo, m.descripcion, m.tipo, u.nombre, u.a_paterno
         ORDER BY ${relevance} m.fecha_creacion DESC
         LIMIT ${safeLimit}`,
        params
      )
    );
  },

  async getUserSummary(userId) {
    const rows = await safeQuery(
      `SELECT
         u.nombre,
         u.a_paterno,
         u.a_materno,
         u.correo,
         u.telefono,
         u.matricula,
         u.grupo,
         u.estado,
         r.nombre_rol AS rol,
         c.nombre_carrera AS carrera,
         s.nombre_semestre AS semestre
       FROM usuarios u
       INNER JOIN roles r ON r.id_rol = u.id_rol
       LEFT JOIN carreras c ON c.id_carrera = u.id_carrera
       LEFT JOIN semestres s ON s.id_semestre = u.id_semestre
       WHERE u.id_usuario = ?
       LIMIT 1`,
      [userId],
      []
    );

    return rows[0] || null;
  },

  async getUserLoans(userId, limit = 5) {
    const safeLimit = clampLimit(limit, 5, 8);

    return safeQuery(
      `SELECT
         p.id_prestamo,
         l.titulo,
         p.estado,
         DATE_FORMAT(p.fecha_prestamo, '%Y-%m-%dT%H:%i:%s') AS fecha_prestamo,
         DATE_FORMAT(p.fecha_vencimiento, '%Y-%m-%dT%H:%i:%s') AS fecha_vencimiento,
         CASE
           WHEN p.fecha_devolucion IS NULL THEN NULL
           ELSE DATE_FORMAT(p.fecha_devolucion, '%Y-%m-%dT%H:%i:%s')
         END AS fecha_devolucion
       FROM prestamos p
       INNER JOIN libros l ON l.id = p.libro_id
       WHERE p.id_usuario = ?
       ORDER BY
         CASE p.estado WHEN 'Vencido' THEN 0 WHEN 'Activo' THEN 1 ELSE 2 END,
         p.fecha_prestamo DESC,
         p.id_prestamo DESC
       LIMIT ${safeLimit}`,
      [userId],
      []
    );
  },

  async saveInteraction({
    sessionId,
    message,
    intent,
    confidence,
    responsePreview,
    route,
    role,
    ip,
    userAgent,
  }) {
    try {
      await poolPromise.query(
        `INSERT INTO asistente_virtual_interacciones
         (session_id, mensaje_usuario, intencion, confianza, respuesta_resumen,
          ruta_origen, rol_usuario, ip_origen, user_agent)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          compact(sessionId, 100),
          compact(message, 1000),
          compact(intent, 80),
          Number(confidence || 0),
          compact(responsePreview, 800),
          compact(route, 180),
          compact(role, 80),
          compact(ip, 80),
          compact(userAgent, 255),
        ]
      );
    } catch (error) {
      if (!shouldIgnoreDbError(error)) {
        console.warn("[assistant] No se pudo registrar la interaccion:", error.message);
      }
    }
  },
};

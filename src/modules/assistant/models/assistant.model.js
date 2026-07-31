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

  async getContact() {
    const rows = await safeQuery(
      `SELECT telefono, correo, direccion, horario, facebook, instagram, twitter, whatsapp
       FROM contacto_info
       WHERE estado = 'Activo'
       ORDER BY id_contacto DESC
       LIMIT 1`,
      [],
      []
    );

    return rows[0] || null;
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

  async searchBooks(term, limit = 4) {
    const safeLimit = clampLimit(limit, 4, 8);
    const search = compact(term, 120);
    const params = [];
    let filter = "";

    if (search) {
      const like = `%${search}%`;
      filter = `
        AND (
          l.titulo LIKE ?
          OR EXISTS (
            SELECT 1
            FROM libro_autor la2
            JOIN autores a2 ON a2.id = la2.autor_id
            WHERE la2.libro_id = l.id AND a2.nombre LIKE ?
          )
          OR EXISTS (
            SELECT 1
            FROM libro_materia lm2
            JOIN materias m2 ON m2.id = lm2.materia_id
            WHERE lm2.libro_id = l.id AND m2.nombre LIKE ?
          )
        )`;
      params.push(like, like, like);
    }

    return safeQuery(
      `SELECT
          l.id,
          l.titulo,
          GROUP_CONCAT(DISTINCT a.nombre SEPARATOR '; ') AS autores,
          GROUP_CONCAT(DISTINCT m.nombre SEPARATOR ', ') AS materias,
          GROUP_CONCAT(DISTINCT s.nombre_semestre SEPARATOR ', ') AS semestres,
          MAX(CASE WHEN f.tipo = 'FISICO' THEN f.disponibles END) AS disponibles,
          MAX(CASE WHEN f.tipo = 'DIGITAL' THEN 1 ELSE 0 END) AS tiene_digital,
          MAX(CASE WHEN f.tipo = 'FISICO' THEN 1 ELSE 0 END) AS tiene_fisico
       FROM libros l
       LEFT JOIN libro_autor la ON la.libro_id = l.id
       LEFT JOIN autores a ON a.id = la.autor_id
       LEFT JOIN libro_materia lm ON lm.libro_id = l.id
       LEFT JOIN materias m ON m.id = lm.materia_id
       LEFT JOIN libro_semestre ls ON ls.libro_id = l.id
       LEFT JOIN semestres s ON s.id_semestre = ls.semestre_id
       LEFT JOIN libro_formatos f ON f.libro_id = l.id
       WHERE l.activo = 1
       ${filter}
       GROUP BY l.id, l.titulo
       ORDER BY l.titulo ASC
       LIMIT ${safeLimit}`,
      params
    );
  },

  async searchNews(term, limit = 3) {
    const safeLimit = clampLimit(limit, 3, 6);
    const search = compact(term, 120);
    const params = [];
    let filter = "";

    if (search) {
      const like = `%${search}%`;
      filter = "AND (titulo LIKE ? OR contenido LIKE ? OR COALESCE(categoria, '') LIKE ?)";
      params.push(like, like, like);
    }

    return safeQuery(
      `SELECT id_noticia, titulo, contenido, categoria, fecha_publicacion
       FROM noticias
       WHERE estado = 'Publicada'
         AND fecha_publicacion <= ${LOCAL_NOW_SQL}
         AND (fecha_caducidad IS NULL OR fecha_caducidad > ${LOCAL_NOW_SQL})
         ${filter}
       ORDER BY fecha_publicacion DESC
       LIMIT ${safeLimit}`,
      params
    );
  },

  async searchEvents(term, limit = 3) {
    const safeLimit = clampLimit(limit, 3, 6);
    const search = compact(term, 120);
    const params = [];
    let filter = "";

    if (search) {
      const like = `%${search}%`;
      filter = `
        AND (
          e.titulo LIKE ?
          OR e.descripcion LIKE ?
          OR COALESCE(e.ubicacion, '') LIKE ?
          OR COALESCE(e.enlace, '') LIKE ?
        )`;
      params.push(like, like, like, like);
    }

    return safeQuery(
      `SELECT
          e.id_evento,
          e.titulo,
          e.descripcion,
          e.tipo,
          e.ubicacion,
          e.enlace,
          e.fecha_inicio,
          e.fecha_fin,
          e.estado,
          e.destacado
       FROM eventos e
       WHERE e.estado IN ('Publicado', 'Finalizado')
       ${filter}
       ORDER BY e.destacado DESC, e.fecha_inicio ASC, e.id_evento DESC
       LIMIT ${safeLimit}`,
      params
    );
  },

  async searchMagazines(term, limit = 3) {
    const safeLimit = clampLimit(limit, 3, 6);
    const search = compact(term, 120);
    const params = [];
    let filter = "";

    if (search) {
      const like = `%${search}%`;
      filter = "AND (titulo LIKE ? OR descripcion LIKE ?)";
      params.push(like, like);
    }

    return safeQuery(
      `SELECT id_revista, titulo, descripcion, precio, stock
       FROM revistas
       WHERE estado = 'Activa'
         AND stock > 0
         ${filter}
       ORDER BY created_at DESC
       LIMIT ${safeLimit}`,
      params
    );
  },

  async searchMaterials(term, limit = 3) {
    const safeLimit = clampLimit(limit, 3, 6);
    const search = compact(term, 120);
    const params = [];
    let filter = "";

    if (search) {
      const like = `%${search}%`;
      filter = `
        AND (
          m.titulo LIKE ?
          OR m.descripcion LIKE ?
          OR mat.nombre LIKE ?
          OR u.nombre LIKE ?
        )`;
      params.push(like, like, like, like);
    }

    return safeQuery(
      `SELECT
          m.id_material,
          m.titulo,
          m.descripcion,
          m.tipo,
          u.nombre AS nombre_docente,
          GROUP_CONCAT(DISTINCT mat.nombre SEPARATOR ', ') AS materias
       FROM materiales m
       JOIN usuarios u ON m.id_usuario = u.id_usuario
       LEFT JOIN material_materia mm ON m.id_material = mm.id_material
       LEFT JOIN materias mat ON mm.id_materia = mat.id
       WHERE m.activo = 1
         AND m.visibilidad = 'PUBLICO'
         ${filter}
       GROUP BY m.id_material, m.titulo, m.descripcion, m.tipo, u.nombre
       ORDER BY m.fecha_creacion DESC
       LIMIT ${safeLimit}`,
      params
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

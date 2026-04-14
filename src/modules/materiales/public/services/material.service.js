import { poolConsulta } from "../../../../config/dbPools/poolConsulta.config.js";

export const PublicMaterialService = {

  async getAll(filters) {

    let query = `
      SELECT 
        m.*,
        u.nombre,
        GROUP_CONCAT(DISTINCT mat.nombre) AS materias,
        GROUP_CONCAT(DISTINCT s.nombre_semestre) AS semestres
      FROM materiales m
      JOIN usuarios u ON m.id_usuario = u.id_usuario
      LEFT JOIN material_materia mm ON m.id_material = mm.id_material
      LEFT JOIN materias mat ON mm.id_materia = mat.id
      LEFT JOIN material_semestre ms ON m.id_material = ms.id_material
      LEFT JOIN semestres s ON ms.id_semestre = s.id_semestre
      WHERE m.activo = 1 AND m.visibilidad = 'PUBLICO'
    `;

    const params = [];

    if (filters.search && filters.search.trim().length > 0) {
      query += ` AND (
        m.titulo LIKE ?
        OR m.descripcion LIKE ?
      )`;
      params.push(
        `%${filters.search}%`,
        `%${filters.search}%`
      );
    }

    if (filters.materia) {
      query += ` AND m.id_material IN (
        SELECT id_material FROM material_materia WHERE id_materia = ?
      )`;
      params.push(filters.materia);
    }

    if (filters.semestre) {
      query += ` AND m.id_material IN (
        SELECT id_material FROM material_semestre WHERE id_semestre = ?
      )`;
      params.push(filters.semestre);
    }

    if (filters.tipo) {
      query += ` AND m.tipo = ?`;
      params.push(filters.tipo);
    }

    if (filters.docente) {
      query += ` AND m.id_usuario = ?`;
      params.push(filters.docente);
    }

    query += ` GROUP BY m.id_material`;

    //  PAGINACIÓN
    const limit = parseInt(filters.limit) || 6;
    const page = parseInt(filters.page) || 1;
    const offset = (page - 1) * limit;

    query += ` LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const [rows] = await poolConsulta.query(query, params);

    return rows;
  },

  // ──────────────────────────────────────────────────────────────
  // getAllWithDocente — ahora con paginación y total
  // ──────────────────────────────────────────────────────────────
  async getAllWithDocente(filters) {
    const params      = [];
    const countParams = [];

    let whereClause = `WHERE m.activo = 1 AND m.visibilidad = 'PUBLICO'`;

    if (filters.search?.trim()) {
      whereClause += ` AND (m.titulo LIKE ? OR m.descripcion LIKE ?)`;
      params.push(`%${filters.search}%`, `%${filters.search}%`);
      countParams.push(`%${filters.search}%`, `%${filters.search}%`);
    }

    if (filters.docente) {
      whereClause += ` AND m.id_usuario = ?`;
      params.push(filters.docente);
      countParams.push(filters.docente);
    }

    if (filters.tipo) {
      whereClause += ` AND m.tipo = ?`;
      params.push(filters.tipo);
      countParams.push(filters.tipo);
    }

    // Filtro por semestre del alumno (enviado automáticamente desde el frontend)
    if (filters.semestre) {
      whereClause += ` AND m.id_material IN (
        SELECT id_material FROM material_semestre WHERE id_semestre = ?
      )`;
      params.push(filters.semestre);
      countParams.push(filters.semestre);
    }

    if (filters.materia) {
      whereClause += ` AND m.id_material IN (
        SELECT id_material FROM material_materia WHERE id_materia = ?
      )`;
      params.push(filters.materia);
      countParams.push(filters.materia);
    }

    // ── Contar total (sin paginación) ──
    const countQuery = `
      SELECT COUNT(DISTINCT m.id_material) AS total
      FROM materiales m
      JOIN usuarios u ON m.id_usuario = u.id_usuario
      LEFT JOIN material_materia mm ON m.id_material = mm.id_material
      LEFT JOIN materias mat ON mm.id_materia = mat.id
      LEFT JOIN material_semestre ms ON m.id_material = ms.id_material
      LEFT JOIN semestres s ON ms.id_semestre = s.id_semestre
      ${whereClause}
    `;
    const [[{ total }]] = await poolConsulta.query(countQuery, countParams);

    // ── Paginación ──
    const limit  = parseInt(filters.limit)  || 9;
    const page   = parseInt(filters.page)   || 1;
    const offset = (page - 1) * limit;

    const dataQuery = `
      SELECT 
        m.*,
        u.nombre AS nombre_docente,
        GROUP_CONCAT(DISTINCT mat.nombre) AS materias,
        GROUP_CONCAT(DISTINCT s.nombre_semestre) AS semestres
      FROM materiales m
      JOIN usuarios u ON m.id_usuario = u.id_usuario
      LEFT JOIN material_materia mm ON m.id_material = mm.id_material
      LEFT JOIN materias mat ON mm.id_materia = mat.id
      LEFT JOIN material_semestre ms ON m.id_material = ms.id_material
      LEFT JOIN semestres s ON ms.id_semestre = s.id_semestre
      ${whereClause}
      GROUP BY m.id_material
      ORDER BY m.fecha_creacion DESC
      LIMIT ? OFFSET ?
    `;
    params.push(limit, offset);

    const [rows] = await poolConsulta.query(dataQuery, params);

    return {
      data:       rows,
      total:      Number(total),
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  },

  async getMaterias() {
    const [rows] = await poolConsulta.query(
      `SELECT id, nombre FROM materias WHERE activo = 1`
    );
    return rows;
  },

  async getSemestres() {
    const [rows] = await poolConsulta.query(
      `SELECT id_semestre, nombre_semestre FROM semestres`
    );
    return rows;
  },

  async getDocentes() {
    const [rows] = await poolConsulta.query(`
      SELECT DISTINCT 
        u.id_usuario,
        u.nombre,
        COUNT(DISTINCT m.id_material) AS total_materiales,
        MAX(m.fecha_creacion) AS ultimo_material
      FROM materiales m
      JOIN usuarios u ON m.id_usuario = u.id_usuario
      WHERE m.activo = 1 AND m.visibilidad = 'PUBLICO'
      GROUP BY u.id_usuario, u.nombre
      ORDER BY u.nombre ASC
    `);
    return rows;
  },

  async getByDocente(id_usuario, filters) {
    let query = `
      SELECT 
        m.*,
        u.nombre,
        GROUP_CONCAT(DISTINCT mat.nombre) AS materias,
        GROUP_CONCAT(DISTINCT s.nombre_semestre) AS semestres
      FROM materiales m
      JOIN usuarios u ON m.id_usuario = u.id_usuario
      LEFT JOIN material_materia mm ON m.id_material = mm.id_material
      LEFT JOIN materias mat ON mm.id_materia = mat.id
      LEFT JOIN material_semestre ms ON m.id_material = ms.id_material
      LEFT JOIN semestres s ON ms.id_semestre = s.id_semestre
      WHERE m.activo = 1 
        AND m.visibilidad = 'PUBLICO'
        AND m.id_usuario = ?
    `;

    const params = [id_usuario];

    if (filters.search?.trim()) {
      query += ` AND (m.titulo LIKE ? OR m.descripcion LIKE ?)`;
      params.push(`%${filters.search}%`, `%${filters.search}%`);
    }

    if (filters.materia) {
      query += ` AND m.id_material IN (
        SELECT id_material FROM material_materia WHERE id_materia = ?
      )`;
      params.push(filters.materia);
    }

    if (filters.semestre) {
      query += ` AND m.id_material IN (
        SELECT id_material FROM material_semestre WHERE id_semestre = ?
      )`;
      params.push(filters.semestre);
    }

    if (filters.tipo) {
      query += ` AND m.tipo = ?`;
      params.push(filters.tipo);
    }

    query += ` GROUP BY m.id_material ORDER BY m.fecha_creacion DESC`;

    const [rows] = await poolConsulta.query(query, params);
    return rows;
  },

  async getDocenteInfo(id_usuario) {
    const [rows] = await poolConsulta.query(`
      SELECT 
        u.id_usuario,
        u.nombre,
        COUNT(DISTINCT m.id_material) AS total_materiales,
        MAX(m.fecha_creacion) AS ultimo_material,
        GROUP_CONCAT(DISTINCT mat.nombre ORDER BY mat.nombre) AS materias,
        GROUP_CONCAT(DISTINCT s.nombre_semestre ORDER BY s.nombre_semestre) AS semestres
      FROM usuarios u
      LEFT JOIN materiales m ON m.id_usuario = u.id_usuario 
        AND m.activo = 1 AND m.visibilidad = 'PUBLICO'
      LEFT JOIN material_materia mm ON mm.id_material = m.id_material
      LEFT JOIN materias mat ON mat.id = mm.id_materia
      LEFT JOIN material_semestre ms ON ms.id_material = m.id_material
      LEFT JOIN semestres s ON s.id_semestre = ms.id_semestre
      WHERE u.id_usuario = ?
      GROUP BY u.id_usuario, u.nombre
    `, [id_usuario]);
    return rows[0];
  },
};
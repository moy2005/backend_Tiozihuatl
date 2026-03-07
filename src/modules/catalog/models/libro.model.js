import { poolPromise } from "../../../config/db.config.js";

const searchBooks = async ({ search, autor, materia, formato, ordenAutor }) => {

  let query = `
    SELECT
      l.id,
      l.titulo,
      l.autor,
      l.editorial,

      GROUP_CONCAT(DISTINCT m.nombre) AS materias,

      MAX(CASE WHEN f.tipo = 'FISICO' THEN f.total END) AS total,
      MAX(CASE WHEN f.tipo = 'FISICO' THEN f.disponibles END) AS disponibles,

      MAX(CASE WHEN f.tipo = 'DIGITAL' THEN f.pdf_url END) AS pdf_url,

      MAX(CASE WHEN f.tipo = 'DIGITAL' THEN 1 ELSE 0 END) AS tiene_digital,
      MAX(CASE WHEN f.tipo = 'FISICO' THEN 1 ELSE 0 END) AS tiene_fisico

    FROM libros l
    LEFT JOIN libro_materia lm ON lm.libro_id = l.id
    LEFT JOIN materias m ON m.id = lm.materia_id
    LEFT JOIN libro_formatos f ON f.libro_id = l.id
    WHERE l.activo = 1
  `;

  const params = [];

  if (search) {
    query += ` AND (l.titulo LIKE ? OR l.autor LIKE ?)`;
    params.push(`%${search}%`, `%${search}%`);
  }

  if (autor) {
    query += ` AND l.autor LIKE ?`;
    params.push(`%${autor}%`);
  }
//FILTRO POR MATERIA
  if (materia) {
    query += ` AND m.nombre = ?`;
    params.push(materia);
  }
//FILTRO POR FORMATO
  if (formato === 'FISICO') {
    query += ` AND f.tipo = 'FISICO'`;
  }

  if (formato === 'DIGITAL') {
    query += ` AND f.tipo = 'DIGITAL'`;
  }
//ORDEN POR AUTOR
  query += ` GROUP BY l.id`;
  if (ordenAutor === 'ASC') {
  query += ` ORDER BY l.autor ASC`;
}

if (ordenAutor === 'DESC') {
  query += ` ORDER BY l.autor DESC`;
}

  const [rows] = await poolPromise.execute(query, params);
  return rows;
};


/** ➕ Crear libro (admin) */
const createLibro = async (data) => {
  const {
    titulo,
    autor,
    editorial,
    materias,
    formatos // ← CLAVE
  } = data;

  if (!titulo || !autor ) {
    throw new Error('Datos incompletos para crear libro');
  }

  const conn = await poolPromise.getConnection();

  try {
    await conn.beginTransaction();

    // 1. Crear libro base
    const [result] = await conn.execute(
      `INSERT INTO libros (titulo, autor, editorial)
       VALUES (?, ?, ?)`,
      [titulo, autor, editorial]
    );

    const libroId = result.insertId;

    // 2. Insertar materias (tabla intermedia)
    for (const materiaId of materias) {
      await conn.execute(
        `INSERT INTO libro_materia (libro_id, materia_id)
         VALUES (?, ?)`,
        [libroId, materiaId]
      );
    }

    // 3. Insertar formatos
    for (const f of formatos) {
      await conn.execute(
        `INSERT INTO libro_formatos
         (libro_id, tipo, total, disponibles, pdf_url)
         VALUES (?, ?, ?, ?, ?)`,
        [
          libroId,
          f.tipo,
          f.total ?? null,
          f.disponibles ?? null,
          f.pdf_url ?? null
        ]
      );
    }

    await conn.commit();
    return libroId;

  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
};

const getAll = async () => {
  const [rows] = await poolPromise.execute(`
      SELECT
      l.id,
      l.titulo,
      l.autor,
      l.editorial,

      GROUP_CONCAT(DISTINCT m.nombre) AS materias,

      MAX(CASE WHEN f.tipo = 'FISICO' THEN f.total END) AS total,
      MAX(CASE WHEN f.tipo = 'FISICO' THEN f.disponibles END) AS disponibles,

      MAX(CASE WHEN f.tipo = 'DIGITAL' THEN f.pdf_url END) AS pdf_url,

      MAX(CASE WHEN f.tipo = 'DIGITAL' THEN 1 ELSE 0 END) AS tiene_digital,
      MAX(CASE WHEN f.tipo = 'FISICO' THEN 1 ELSE 0 END) AS tiene_fisico

    FROM libros l
    LEFT JOIN libro_materia lm ON lm.libro_id = l.id
    LEFT JOIN materias m ON m.id = lm.materia_id
    LEFT JOIN libro_formatos f ON f.libro_id = l.id
    
    GROUP BY l.id
  `);
  return rows;
};


/** 📚 Listado admin */
const getAllAdmin = async () => {

  const [libros] = await poolPromise.execute(
    `SELECT
      l.id,
      l.titulo,
      l.autor,
      l.editorial,
      IFNULL(l.activo, 0) AS activo,
      GROUP_CONCAT(DISTINCT m.nombre) AS materias
     FROM libros l
     LEFT JOIN libro_materia lm ON lm.libro_id = l.id
     LEFT JOIN materias m ON m.id = lm.materia_id
     GROUP BY l.id`
  );

  for (let libro of libros) {

    const [formatos] = await poolPromise.execute(
      `SELECT tipo, total, disponibles, pdf_url
       FROM libro_formatos
       WHERE libro_id = ?`,
      [libro.id]
    );

    // 🔹 Inicializamos valores como lo espera Angular
    libro.tiene_fisico = 0;
    libro.tiene_digital = 0;
    libro.total = null;
    libro.disponibles = null;
    libro.pdf_url = null;

    for (let f of formatos) {
      if (f.tipo === 'FISICO') {
        libro.tiene_fisico = 1;
        libro.total = f.total;
        libro.disponibles = f.disponibles;
      }

      if (f.tipo === 'DIGITAL') {
        libro.tiene_digital = 1;
        libro.pdf_url = f.pdf_url;
      }
    }

    // 🔹 Guardamos también formatos completos si los necesitas
    libro.formatos = formatos;

    // 🔹 Normalización estricta activo
    libro.activo = Number(libro.activo) === 1 ? 1 : 0;
  }

  return libros;
};

const updateLibro = async (id, data) => {

  const {
    titulo,
    autor,
    editorial,
    materias,
    tiene_fisico,
    tiene_digital,
    total,
    pdf_url
  } = data;

  const conn = await poolPromise.getConnection();

  try {
    await conn.beginTransaction();

    // 1️ Actualizar libro base
    await conn.execute(
      `UPDATE libros
       SET titulo = ?, autor = ?, editorial = ?
       WHERE id = ?`,
      [titulo, autor, editorial, id]
    );

    // 2️⃣ Actualizar materias
    if (materias && materias.length > 0 && materias [0]) {

      await conn.execute(
        `DELETE FROM libro_materia WHERE libro_id = ?`,
        [id]
      );

      for (const materiaId of materias) {
        await conn.execute(
          `INSERT INTO libro_materia (libro_id, materia_id)
           VALUES (?, ?)`,
          [id, materiaId]
        );
      }
    }

    // 3️ FÍSICO
    if (tiene_fisico !== undefined) {

      if (tiene_fisico == 1) {

        await conn.execute(
          `INSERT INTO libro_formatos (libro_id, tipo, total, disponibles)
           VALUES (?, 'FISICO', ?, ?)
           ON DUPLICATE KEY UPDATE
             total = VALUES(total),
             disponibles = VALUES(disponibles)`,
          [id, total, total]
        );

      } else {

        await conn.execute(
          `DELETE FROM libro_formatos
           WHERE libro_id = ? AND tipo = 'FISICO'`,
          [id]
        );
      }
    }

    // 4️ DIGITAL
    if (tiene_digital !== undefined) {

      if (tiene_digital == 1) {

        await conn.execute(
          `INSERT INTO libro_formatos (libro_id, tipo, pdf_url)
           VALUES (?, 'DIGITAL', ?)
           ON DUPLICATE KEY UPDATE
             pdf_url = VALUES(pdf_url)`,
          [id, pdf_url]
        );

      } else {

        await conn.execute(
          `DELETE FROM libro_formatos
           WHERE libro_id = ? AND tipo = 'DIGITAL'`,
          [id]
        );
      }
    }

    await conn.commit();

  } catch (error) {

    await conn.rollback();
    throw error;

  } finally {

    conn.release();
  }
};

const cambiarEstado = async (id, activo) => {
  await poolPromise.execute(
    `UPDATE libros SET activo = ? WHERE id = ?`,
    [activo, id]
  );
};

const getMaterias = async () => {
  const [rows] = await poolPromise.execute(`
    SELECT id, nombre          -- ✅ agregar id
    FROM materias
    ORDER BY nombre ASC
  `);
  return rows;
};

const getLibroDigitalById = async (id) => {
  const [rows] = await poolPromise.execute(`
    SELECT 
      l.id,
      l.titulo,
      l.activo,
      f.pdf_url
    FROM libros l
    JOIN libro_formatos f 
      ON f.libro_id = l.id 
      AND f.tipo = 'DIGITAL'
    WHERE l.id = ?
    LIMIT 1
  `, [id]);

  return rows[0] || null;
};

export default {
  searchBooks,
  createLibro,
  getAllAdmin,
  updateLibro,
  cambiarEstado,
  getAll,
  getMaterias,
  getLibroDigitalById
};

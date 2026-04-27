import { poolPromise } from "../../../config/db.config.js";

const searchBooks = async ({ search, autor, materia, formato, ordenAutor, semestre }) => {

  let query = `
    SELECT
    l.id,
    l.titulo,
    GROUP_CONCAT(DISTINCT a.nombre SEPARATOR '; ') AS autores,
    GROUP_CONCAT(DISTINCT m.nombre) AS materias,
    GROUP_CONCAT(DISTINCT s.nombre_semestre) AS semestres,
    GROUP_CONCAT(DISTINCT s.id_semestre) AS semestres_ids,

    MAX(CASE WHEN f.tipo = 'FISICO' THEN f.total END) AS total,
    MAX(CASE WHEN f.tipo = 'FISICO' THEN f.disponibles END) AS disponibles,

    MAX(CASE WHEN f.tipo = 'DIGITAL' THEN f.pdf_url END) AS pdf_url,

    MAX(CASE WHEN f.tipo = 'DIGITAL' THEN 1 ELSE 0 END) AS tiene_digital,
    MAX(CASE WHEN f.tipo = 'FISICO' THEN 1 ELSE 0 END) AS tiene_fisico

  FROM libros l
  LEFT JOIN libro_semestre ls ON ls.libro_id = l.id
  LEFT JOIN semestres s ON s.id_semestre = ls.semestre_id
  LEFT JOIN libro_autor la ON la.libro_id = l.id
  LEFT JOIN autores a ON a.id = la.autor_id

  LEFT JOIN libro_materia lm ON lm.libro_id = l.id
  LEFT JOIN materias m ON m.id = lm.materia_id

  LEFT JOIN libro_formatos f ON f.libro_id = l.id

  WHERE l.activo = 1
  `;

  const params = [];

 if (search) {
    query += ` AND (l.titulo LIKE ? OR EXISTS ( SELECT 1 FROM libro_autor la2
    JOIN autores a2 ON a2.id = la2.autor_id
    WHERE la2.libro_id = l.id AND a2.nombre LIKE ? ))`;
    params.push(`%${search}%`, `%${search}%`);
  }
  
  if (autor) {
    query += ` AND a.nombre LIKE ?`;
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

  if (semestre) {
    query += ` AND s.id_semestre = ?`;
    params.push(semestre);
  }
//ORDEN POR AUTOR
  query += ` GROUP BY 
  l.id,
  l.titulo,
  l.activo`;

  if (ordenAutor === 'ASC') {
  query += ` ORDER BY autores ASC`;
}

if (ordenAutor === 'DESC') {
  query += ` ORDER BY autores DESC`;
}

  const [rows] = await poolPromise.execute(query, params);
  return rows;
};

const searchBooksAdmin = async ({ search, materia, formato, ordenAutor, activo, semestre }) => {

  let query = `
    SELECT
      l.id,
      l.titulo,
      GROUP_CONCAT(DISTINCT a.nombre SEPARATOR '; ') AS autores,
      l.activo,
      GROUP_CONCAT(DISTINCT m.nombre) AS materias,
      GROUP_CONCAT(DISTINCT s.nombre_semestre) AS semestres,
      GROUP_CONCAT(DISTINCT s.id_semestre) AS semestres_ids,

      MAX(CASE WHEN f.tipo = 'FISICO' THEN f.total END) AS total,
      MAX(CASE WHEN f.tipo = 'FISICO' THEN f.disponibles END) AS disponibles,

      MAX(CASE WHEN f.tipo = 'DIGITAL' THEN f.pdf_url END) AS pdf_url,

      MAX(CASE WHEN f.tipo = 'DIGITAL' THEN 1 ELSE 0 END) AS tiene_digital,
      MAX(CASE WHEN f.tipo = 'FISICO' THEN 1 ELSE 0 END) AS tiene_fisico

    FROM libros l
    LEFT JOIN libro_semestre ls ON ls.libro_id = l.id
    LEFT JOIN semestres s ON s.id_semestre = ls.semestre_id
    LEFT JOIN libro_autor la ON la.libro_id = l.id
    LEFT JOIN autores a ON a.id = la.autor_id
    LEFT JOIN libro_materia lm ON lm.libro_id = l.id
    LEFT JOIN materias m ON m.id = lm.materia_id
    LEFT JOIN libro_formatos f ON f.libro_id = l.id
    WHERE 1=1
  `;

  const params = [];

  if (search) {
    query += ` AND (l.titulo LIKE ? OR a.nombre LIKE ?)`;
    params.push(`%${search}%`, `%${search}%`);
  }

  if (materia) {
    query += ` AND m.nombre = ?`;
    params.push(materia);
  }

  if (formato === 'FISICO') {
    query += ` AND f.tipo = 'FISICO'`;
  }

  if (formato === 'DIGITAL') {
    query += ` AND f.tipo = 'DIGITAL'`;
  }

  if (activo !== undefined) {
    query += ` AND l.activo = ?`;
    params.push(activo);
  }

  if (semestre) {
    query += ` AND s.id_semestre = ?`;
    params.push(semestre);
  }

  query += ` GROUP BY l.id`;

  if (ordenAutor === 'ASC') {
    query += ` ORDER BY autores ASC`;
  }

  if (ordenAutor === 'DESC') {
    query += ` ORDER BY autores DESC`;
  }

  const [rows] = await poolPromise.execute(query, params);

  return rows;
};

const createLibro = async (data) => {

  const {
    titulo,
    autor,
    materias,
    formatos,
    semestres
  } = data;

  if (!titulo || !autor) {
    throw new Error('Datos incompletos para crear libro');
  }

  const conn = await poolPromise.getConnection();

  try {

    await conn.beginTransaction();

    // ================================
    //  CREAR LIBRO
    // ================================

    const [result] = await conn.execute(
      `INSERT INTO libros (titulo)
       VALUES (?)`,
      [titulo]
    );

    const libroId = result.insertId;

    // ================================
    //  PROCESAR AUTORES
    // ================================

    const autores = autor.split(';').map(a => a.trim()).filter(a => a);

    for (const nombreAutor of autores) {

      const [rows] = await conn.execute(
        `SELECT id FROM autores WHERE nombre = ?`,
        [nombreAutor]
      );

      let autorId;

      if (rows.length > 0) {

        autorId = rows[0].id;

      } else {

        const [nuevoAutor] = await conn.execute(
          `INSERT INTO autores (nombre) VALUES (?)`,
          [nombreAutor]
        );

        autorId = nuevoAutor.insertId;

      }

      await conn.execute(
        `INSERT INTO libro_autor (libro_id, autor_id)
         VALUES (?, ?)`,
        [libroId, autorId]
      );

    }

    // ================================
    //  INSERTAR MATERIAS
    // ================================

    for (const materiaId of materias) {

      await conn.execute(
        `INSERT INTO libro_materia (libro_id, materia_id)
         VALUES (?, ?)`,
        [libroId, materiaId]
      );

    }

    // ================================
    //  INSERTAR FORMATOS
    // ================================

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

    // ================================
    //  INSERTAR SEMESTRES
    // ================================

    if (semestres && semestres.length > 0) {
      for (const semestreId of semestres) {
        await conn.execute(
          `INSERT INTO libro_semestre (libro_id, semestre_id)
          VALUES (?, ?)`,
          [libroId, semestreId]
        );
      }
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
      GROUP_CONCAT(DISTINCT a.nombre SEPARATOR '; ') AS autores,
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
    LEFT JOIN libro_autor la ON la.libro_id = l.id
    LEFT JOIN autores a ON a.id = la.autor_id
    GROUP BY l.id
  `);
  return rows;
};


/**  Listado admin */
const getAllAdmin = async () => {

  const [libros] = await poolPromise.execute(
    `SELECT
      l.id,
      l.titulo,
      GROUP_CONCAT(DISTINCT a.nombre SEPARATOR '; ') AS autores,
      IFNULL(l.activo, 0) AS activo,
      GROUP_CONCAT(DISTINCT m.nombre) AS materias
     FROM libros l
     LEFT JOIN libro_materia lm ON lm.libro_id = l.id
     LEFT JOIN materias m ON m.id = lm.materia_id
     LEFT JOIN libro_autor la ON la.libro_id = l.id
     LEFT JOIN autores a ON a.id = la.autor_id
     GROUP BY l.id`
  );

  for (let libro of libros) {

    const [formatos] = await poolPromise.execute(
      `SELECT tipo, total, disponibles, pdf_url
       FROM libro_formatos
       WHERE libro_id = ?`,
      [libro.id]
    );

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

    // Guardamos también formatos completos si los necesitas
    libro.formatos = formatos;

    //  Normalización estricta activo
    libro.activo = Number(libro.activo) === 1 ? 1 : 0;
  }

  return libros;
};

const updateLibro = async (id, data) => {

  const {
    titulo,
    autor,
    materias,
    semestres,
    tiene_fisico,
    tiene_digital,
    total,
    pdf_url
  } = data;

  const conn = await poolPromise.getConnection();

  try {

    await conn.beginTransaction();

    //  Actualizar libro base
    await conn.execute(
      `UPDATE libros
       SET titulo = ?
       WHERE id = ?`,
      [titulo, id]
    );

    //  Actualizar autores
    await conn.execute(
      `DELETE FROM libro_autor WHERE libro_id = ?`,
      [id]
    );

    const autores = autor.split(';').map(a => a.trim()).filter(a => a);

    for (const nombreAutor of autores) {

      const [rows] = await conn.execute(
        `SELECT id FROM autores WHERE nombre = ?`,
        [nombreAutor]
      );

      let autorId;

      if (rows.length > 0) {

        autorId = rows[0].id;

      } else {

        const [nuevoAutor] = await conn.execute(
          `INSERT INTO autores (nombre) VALUES (?)`,
          [nombreAutor]
        );

        autorId = nuevoAutor.insertId;

      }

      await conn.execute(
        `INSERT INTO libro_autor (libro_id, autor_id)
         VALUES (?, ?)`,
        [id, autorId]
      );

    }

    //  Actualizar materias
    if (materias && materias.length > 0 && materias[0]) {

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

    // ================================
    //  ACTUALIZAR SEMESTRES
    // ================================

    if (semestres) {

      await conn.execute(
        `DELETE FROM libro_semestre WHERE libro_id = ?`,
        [id]
      );

      for (const semestreId of semestres) {
        await conn.execute(
          `INSERT INTO libro_semestre (libro_id, semestre_id)
          VALUES (?, ?)`,
          [id, semestreId]
        );
      }
    }

    //  FÍSICO
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

    //  DIGITAL
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
    SELECT id, nombre          
    FROM materias
    WHERE activo = 1
    ORDER BY nombre ASC
  `);
  return rows;
};

const getSemestres = async () => {
  const [rows] = await poolPromise.execute(`
    SELECT id_semestre, nombre_semestre
    FROM semestres
    ORDER BY id_semestre ASC
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

const getAllAutores = async () => {
  const [rows] = await poolPromise.execute(
    `SELECT id, nombre FROM autores ORDER BY nombre ASC`
  );
  return rows;
};

const deleteLibro = async (id) => {
  const conn = await poolPromise.getConnection();
  try {
    await conn.beginTransaction();

    // Obtener pdf_url antes de borrar
    const [formatos] = await conn.execute(
      `SELECT pdf_url FROM libro_formatos 
       WHERE libro_id = ? AND tipo = 'DIGITAL'`,
      [id]
    );

    // Borrar relaciones
    await conn.execute(`DELETE FROM libro_autor    WHERE libro_id = ?`, [id]);
    await conn.execute(`DELETE FROM libro_materia  WHERE libro_id = ?`, [id]);
    await conn.execute(`DELETE FROM libro_semestre WHERE libro_id = ?`, [id]);
    await conn.execute(`DELETE FROM libro_formatos WHERE libro_id = ?`, [id]);
    await conn.execute(`DELETE FROM libros         WHERE id = ?`,       [id]);

    await conn.commit();

    // Devolver public_id del PDF si existía
    return formatos.length > 0 ? formatos[0].pdf_url : null;

  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
};

export default {
  searchBooks,
  searchBooksAdmin,
  createLibro,
  getAllAdmin,
  updateLibro,
  cambiarEstado,
  getAll,
  getMaterias,
  getLibroDigitalById,
  getAllAutores,
  getSemestres,
  deleteLibro
};

import { poolPromise } from "../../../config/db.config.js";

export const getActiveBookById = async (bookId) => {
  const [rows] = await poolPromise.execute(
    `SELECT id, titulo
     FROM libros
     WHERE id = ? AND activo = 1
     LIMIT 1`,
    [bookId]
  );

  return rows[0] || null;
};

export const getAvailableBooksByIds = async (bookIds) => {
  if (!bookIds.length) return [];

  const placeholders = bookIds.map(() => "?").join(", ");
  const [rows] = await poolPromise.execute(
    `SELECT
       l.id,
       l.titulo,
       COALESCE(
         e.nombre,
         'Editorial no disponible'
       ) AS editorial,
       GROUP_CONCAT(
         DISTINCT a.nombre SEPARATOR '; '
       ) AS autores,
       GROUP_CONCAT(
         DISTINCT m.nombre SEPARATOR ', '
       ) AS materias,
       GROUP_CONCAT(
         DISTINCT s.nombre_semestre SEPARATOR ', '
       ) AS semestres,
       MAX(
         CASE WHEN f.tipo = 'FISICO'
         THEN f.disponibles END
       ) AS disponibles,
       MAX(
         CASE WHEN f.tipo = 'DIGITAL'
         THEN f.pdf_url END
       ) AS pdf_url,
       MAX(
         CASE
           WHEN f.tipo = 'DIGITAL'
             AND f.pdf_url IS NOT NULL
           THEN 1 ELSE 0
         END
       ) AS tiene_digital,
       MAX(
         CASE WHEN f.tipo = 'FISICO'
         THEN 1 ELSE 0 END
       ) AS tiene_fisico
     FROM libros l
     LEFT JOIN editoriales e
       ON e.id_editorial = l.id_editorial
     LEFT JOIN libro_autor la
       ON la.libro_id = l.id
     LEFT JOIN autores a
       ON a.id = la.autor_id
     LEFT JOIN libro_materia lm
       ON lm.libro_id = l.id
     LEFT JOIN materias m
       ON m.id = lm.materia_id
     LEFT JOIN libro_semestre ls
       ON ls.libro_id = l.id
     LEFT JOIN semestres s
       ON s.id_semestre = ls.semestre_id
     LEFT JOIN libro_formatos f
       ON f.libro_id = l.id
     WHERE l.activo = 1
       AND l.id IN (${placeholders})
     GROUP BY l.id, l.titulo, e.nombre
     HAVING tiene_digital = 1
       OR (
         tiene_fisico = 1
         AND COALESCE(disponibles, 0) > 0
       )`,
    bookIds
  );

  return rows;
};

import { poolPromise, poolQuery } from '../../../config/db.config.js';

export const addToCart = async (id_usuario, id_revista) => {

  await poolPromise.query(
    `INSERT INTO carrito (id_usuario, id_revista)
     VALUES (?, ?)`,
    [id_usuario, id_revista]
  );

  return { message: 'Added to cart' };
};

export const getCart = async (id_usuario) => {

  const [rows] = await poolPromise.query(`
    SELECT r.id_revista,
           r.titulo,
           r.precio,
           r.portada_url
    FROM carrito c
    JOIN revistas r ON c.id_revista = r.id_revista
    WHERE c.id_usuario = ?
  `, [id_usuario]);

  return rows;
};

export const clearCart = async (id_usuario) => {
  await poolPromise.query(
    `DELETE FROM carrito WHERE id_usuario = ?`,
    [id_usuario]
  );
};

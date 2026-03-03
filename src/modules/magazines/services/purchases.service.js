import { poolPromise } from '../../../config/db.config.js';

export const getUserPurchases = async (id_usuario) => {

  const [rows] = await poolPromise.query(`
    SELECT c.id_compra,
           c.total,
           c.metodo_pago,
           c.created_at,
           r.titulo,
           dc.precio_final
    FROM compras c
    JOIN detalle_compra dc ON c.id_compra = dc.id_compra
    JOIN revistas r ON dc.id_revista = r.id_revista
    WHERE c.id_usuario = ?
    ORDER BY c.created_at DESC
  `, [id_usuario]);

  return rows;
};

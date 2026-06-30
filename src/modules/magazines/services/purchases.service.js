import { poolPromise } from '../../../config/db.config.js';

export const getUserPurchases = async (id_usuario) => {
console.log("purchases.service correcto");
  const [rows] = await poolPromise.query(`
  SELECT 
    r.id_revista,
    r.titulo,

    r.precio,
    r.estado,
    MAX(c.created_at) AS fecha_compra
  FROM compras c
  INNER JOIN detalle_compra dc 
    ON dc.id_compra = c.id_compra
  INNER JOIN revistas r 
    ON r.id_revista = dc.id_revista
  WHERE c.id_usuario = ?
  AND c.estado = 'pagado'
  AND r.estado = 'Activa'
  GROUP BY 
    r.id_revista,
    r.titulo,
    r.precio,
    r.estado
  ORDER BY fecha_compra DESC;
  `, [id_usuario]);

  return rows;
};

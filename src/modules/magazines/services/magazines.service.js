import {poolPromise} from '../../../config/db.config.js';
import cloudinary from '../../../config/cloudinary.js';
import { processPayment } from './payment.service.js';
import { registerAudit } from './audit.service.js';

const activeDiscountJoin = `
  LEFT JOIN (
    SELECT
      rd.id_revista,
      MAX(
        CASE
          WHEN d.tipo = 'porcentaje' THEN r2.precio * (d.valor / 100)
          ELSE d.valor
        END
      ) AS descuento_monto
    FROM revista_descuento rd
    INNER JOIN descuentos d ON d.id_descuento = rd.id_descuento
    INNER JOIN revistas r2 ON r2.id_revista = rd.id_revista
    WHERE d.estado = 'Activo'
      AND CURDATE() BETWEEN d.fecha_inicio AND d.fecha_fin
    GROUP BY rd.id_revista
  ) best_discount ON best_discount.id_revista = r.id_revista
`;

const discountSelect = `
  COALESCE(ROUND(LEAST(r.precio, best_discount.descuento_monto), 2), 0) AS descuento_aplicado,
  ROUND(
    GREATEST(
      r.precio - COALESCE(LEAST(r.precio, best_discount.descuento_monto), 0),
      0
    ),
    2
  ) AS precio_final,
  CASE WHEN best_discount.descuento_monto IS NULL THEN 0 ELSE 1 END AS descuento_activo
`;

/* =====================================
   SIMULACIÓN PASARELA DE PAGO
===================================== */
const simulatePayment = (method) => {

  if (!['efectivo', 'debito', 'credito'].includes(method)) {
    throw new Error('Invalid payment method');
  }

  const approved = Math.random() > 0.1; // 90% éxito

  if (!approved) {
    throw new Error('Payment declined by bank');
  }

  return {
    transaction_id: `TX-${Date.now()}`,
    status: 'approved'
  };
};

export const updateMagazine = async ({
  id,
  titulo,
  descripcion,
  precio,
  stock,
  pdf_public_id
}) => {

  let query = `
    UPDATE revistas
    SET titulo = ?, descripcion = ?, precio = ?, stock = ?
  `;

  const params = [titulo, descripcion, precio, stock];

  if (pdf_public_id) {
    query += `, pdf_public_id = ?`;
    params.push(pdf_public_id);
  }

  query += ` WHERE id_revista = ?`;
  params.push(id);

  await poolPromise.query(query, params);
};

/* =====================================
   GET CATALOG
===================================== */
export const getCatalog = async () => {

  const [rows] = await poolPromise.query(`
    SELECT
      r.id_revista AS id_magazine,
      r.titulo,
      r.descripcion,
      r.precio,
      ${discountSelect},
      r.pdf_public_id,
      r.stock
    FROM revistas r
    ${activeDiscountJoin}
    WHERE r.estado = 'Activa'
    ORDER BY r.titulo ASC
  `);

  return rows;
};

export const deactivateMagazine = async (id) => {
  await poolPromise.query(
    `UPDATE revistas
     SET estado = 'Inactiva'
     WHERE id_revista = ?`,
    [id]
  );
};
/* =====================================
   PURCHASE WITH TRANSACTION
===================================== */
export const processPurchase = async ({
  id_usuario,
  id_magazine,
  payment_method
}) => {

  const connection = await poolPromise.getConnection();

  try {

    await connection.beginTransaction();

    /* 1️⃣ Lock revista */
    const [[magazine]] = await connection.query(
      `SELECT precio, stock
       FROM revistas
       WHERE id_revista = ?
       FOR UPDATE`,
      [id_magazine]
    );

    if (!magazine) throw new Error('Magazine not found');
    if (magazine.stock <= 0) throw new Error('Out of stock');

    /* 2️⃣ Evitar recompra */
    const [[alreadyPurchased]] = await connection.query(`
      SELECT 1
      FROM compras c
      JOIN detalle_compra dc ON c.id_compra = dc.id_compra
      WHERE c.id_usuario = ?
        AND dc.id_revista = ?
        AND c.estado = 'pagado'
    `, [id_usuario, id_magazine]);

    if (alreadyPurchased) {
      throw new Error('You already purchased this magazine');
    }

    /* 3️⃣ Calcular descuento */
    const [[discount]] = await connection.query(`
      SELECT d.tipo, d.valor
      FROM descuentos d
      JOIN revista_descuento rd
        ON d.id_descuento = rd.id_descuento
      WHERE rd.id_revista = ?
        AND d.estado = 'Activo'
        AND CURDATE() BETWEEN d.fecha_inicio AND d.fecha_fin
      LIMIT 1
    `, [id_magazine]);

    const discountApplied = discount
      ? discount.tipo === 'porcentaje'
          ? magazine.precio * (discount.valor / 100)
          : discount.valor
      : 0;

    const finalPrice = magazine.precio - discountApplied;

    if (finalPrice < 0) {
      throw new Error('Invalid final price calculation');
    }

    /* 4️⃣ Crear compra como pendiente */
    const [purchase] = await connection.query(
      `INSERT INTO compras
       (id_usuario, total, estado)
       VALUES (?, ?, 'pendiente')`,
      [id_usuario, finalPrice]
    );

    const id_compra = purchase.insertId;

    /* 5️⃣ Procesar pago (SERVICIO SEPARADO) */
    await processPayment({
      connection,
      id_compra,
      metodo: payment_method,
      monto: finalPrice
    });

    /* 6️⃣ Marcar compra como pagada */
    await connection.query(
      `UPDATE compras
       SET estado = 'pagado'
       WHERE id_compra = ?`,
      [id_compra]
    );

    /* 7️⃣ Insertar detalle */
    await connection.query(
      `INSERT INTO detalle_compra
       (id_compra, id_revista, precio_base, descuento_aplicado, precio_final)
       VALUES (?, ?, ?, ?, ?)`,
      [
        id_compra,
        id_magazine,
        magazine.precio,
        discountApplied,
        finalPrice
      ]
    );

    /* 8️⃣ Reducir stock */
    await connection.query(
      `UPDATE revistas
       SET stock = stock - 1
       WHERE id_revista = ?`,
      [id_magazine]
    );

    /* 9️⃣ Registrar auditoría */
    await registerAudit({
      connection,
      id_usuario,
      id_compra,
      accion: 'COMPRA_REVISTA',
      detalle: `Usuario ${id_usuario} compró revista ${id_magazine}`
    });

    await connection.commit();

    return {
      message: 'Purchase successful',
      purchase_id: id_compra,
      total: finalPrice
    };

  } catch (error) {

    await connection.rollback();
    throw error;

  } finally {
    connection.release();
  }
};

export const getMyPurchases = async (userId) => {

  const [rows] = await poolPromise.query(`
    SELECT 
        r.id_revista,
        r.titulo,
        r.precio,
        r.estado,
        r.pdf_public_id,
        MAX(c.created_at) AS fecha_compra
    FROM compras c
    INNER JOIN detalle_compra dc 
        ON dc.id_compra = c.id_compra
    INNER JOIN revistas r 
        ON r.id_revista = dc.id_revista
        AND r.estado = 'Activa'  
    WHERE c.id_usuario = ?
    AND c.estado = 'pagado'
    GROUP BY r.id_revista, r.titulo, r.precio, r.estado, r.pdf_public_id
    ORDER BY fecha_compra DESC
  `, [userId]);

  return rows;
};


/* =====================================
   SECURE PDF ACCESS
===================================== */
export const getSecurePdf = async (id_usuario, id_revista) => {

  const [rows] = await poolPromise.query(`
    SELECT r.pdf_public_id
    FROM compras c
    JOIN detalle_compra dc ON c.id_compra = dc.id_compra
    JOIN revistas r ON r.id_revista = dc.id_revista
    WHERE c.id_usuario = ?
    AND dc.id_revista = ?
    AND c.estado = 'pagado'
  `, [id_usuario, id_revista]);

  if (!rows.length) {
    throw new Error('Access denied');
  }

  const pdfId = String(rows[0].pdf_public_id || '').replace(/\.pdf$/i, '');

  return cloudinary.url(pdfId, {
    resource_type: 'image',
    secure: true,
    format: 'pdf'
  });
};
/*export const getSecurePdf = async (id_usuario, id_magazine) => {
  

  const [rows] = await poolPromise.query(`
    SELECT r.pdf_public_id
    FROM compras c
    JOIN detalle_compra dc ON c.id_compra = dc.id_compra
    JOIN revistas r ON r.id_revista = dc.id_revista
    WHERE c.id_usuario = ?
    AND dc.id_revista = ?
    AND c.estado = 'pagado'
  `, [id_usuario, id_magazine]);

  if (!rows.length) {
    throw new Error('Access denied');
  }

  const publicId = rows[0].pdf_public_id;
  console.log("PUBLIC ID:", publicId);
  const pdfUrl = cloudinary.url(publicId, {
    resource_type: "image",
    secure: true,
    format: "pdf"
  });

  return pdfUrl;
};*/
/* =====================================
   CREATE MAGAZINE
===================================== */
export const createMagazine = async ({
  titulo,
  descripcion,
  precio,
  stock,
  pdf_public_id
}) => {

  await poolPromise.query(`
    INSERT INTO revistas
    (titulo, descripcion, precio, stock, pdf_public_id, estado)
    VALUES (?, ?, ?, ?, ?, ?)
  `, [
    titulo,
    descripcion,
    precio,
    stock,
    pdf_public_id,
    'Activa'
  ]);
};

export const getAuditoriaCompras = async ({ usuario, fecha_inicio, fecha_fin }) => {

  // ✅ Usar directamente poolPromise del import
  let query = `
    SELECT 
      ac.id_auditoria,
      ac.accion,
      ac.descripcion,
      ac.ip_address,
      ac.user_agent,
      ac.fecha,
      u.nombre AS usuario,
      u.correo,
      c.id_compra,
      r.titulo AS revista
    FROM auditoria_compras ac
    LEFT JOIN usuarios u ON ac.id_usuario = u.id_usuario
    LEFT JOIN compras c ON ac.id_compra = c.id_compra
    LEFT JOIN revistas r ON c.id_revista = r.id_revista
    WHERE 1=1
  `;

  const params = [];

  if (usuario) {
    query += ` AND u.nombre LIKE ?`;
    params.push(`%${usuario}%`);
  }

  if (fecha_inicio) {
    query += ` AND ac.fecha >= ?`;
    params.push(fecha_inicio);
  }

  if (fecha_fin) {
    query += ` AND ac.fecha <= ?`;
    params.push(fecha_fin);
  }

  query += ` ORDER BY ac.fecha DESC`;

  const [rows] = await poolPromise.query(query, params);
  return rows;
};

export const getAllMagazines = async () => {
  const [rows] = await poolPromise.query(`
    SELECT
      r.id_revista,
      r.titulo,
      r.descripcion,
      r.precio,
      ${discountSelect},
      r.stock,
      r.estado,
      r.pdf_public_id
    FROM revistas r
    ${activeDiscountJoin}
    WHERE r.estado = 'Activa'
    ORDER BY r.titulo ASC
  `);

  return rows;
};

export const getById = async (id) => {

  const pool = await poolPromise;

  const [rows] = await pool.query(
    `SELECT 
        id_revista, 
        titulo, 
        descripcion, 
        precio, 
        stock,
        pdf_public_id,
        portada_url
     FROM revistas
     WHERE id_revista = ?
     LIMIT 1`,
    [id]
  );

  return rows[0] || null;
};
export const savePurchase = async (req, res) => {
  const { magazineIds } = req.body;
  const userId = req.user.id;

  const pool = await poolPromise;

  for (let id of magazineIds) {
    await pool.query(
      `INSERT INTO compras (id_usuario, id_revista)
       VALUES (?, ?)`,
      [userId, id]
    );
  }

  res.json({ message: 'Compra guardada' });
};


export const saveReadingProgress = async (id_usuario, id_magazine, page) => {

  await poolPromise.query(`
    INSERT INTO progreso_lectura (id_usuario, id_revista, pagina)
    VALUES (?, ?, ?)
    ON DUPLICATE KEY UPDATE pagina = ?
  `, [id_usuario, id_magazine, page, page]);

};

export const getFilteredMagazines = async (search, sort, letter) => {

  const pool = await poolPromise;

  let query = `
    SELECT
      r.id_revista AS id_magazine,
      r.titulo,
      r.descripcion,
      r.precio,
      ${discountSelect},
      r.pdf_public_id,
      r.stock
    FROM revistas r
    ${activeDiscountJoin}
    WHERE r.estado = 'Activa'
  `;

  const params = [];

  // 🔎 búsqueda por título
  if (search) {
    query += ` AND r.titulo LIKE ?`;
    params.push(`%${search}%`);
  }

  // 🔤 filtro por letra inicial
  if (letter) {
    query += ` AND r.titulo LIKE ?`;
    params.push(`${letter}%`);
  }

  // 🔡 ordenamiento
    if (sort === 'asc') {
      query += ` ORDER BY r.titulo ASC`;
    } else if (sort === 'desc') {
      query += ` ORDER BY r.titulo DESC`;
    } else if (sort === 'price_asc') {
      query += ` ORDER BY precio_final ASC`;
    } else if (sort === 'price_desc') {
      query += ` ORDER BY precio_final DESC`;
    } else if (sort === 'recent') {
      query += ` ORDER BY r.created_at DESC`;
    } else {
      query += ` ORDER BY r.titulo ASC`;
    }

  const [rows] = await pool.query(query, params);

  return rows;
};

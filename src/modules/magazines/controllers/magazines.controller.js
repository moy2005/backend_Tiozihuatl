import * as service from '../services/magazines.service.js';
import cloudinary from '../../../config/cloudinary.config.js';
import { successResponse, errorResponse } from '../../../core/utils/response.util.js';
import fs from 'fs';
import { poolPromise } from '../../../config/db.config.js';
import os from 'os';

console.log("🔥 MAGAZINES CONTROLLER REAL CARGADO");
/* =====================================
   GET CATALOG
===================================== */
export const getCatalog = async (req, res) => {
  try {

    const magazines = await service.getCatalog();
    const magazinesWithCover = magazines.map(m => {
    const portada_url = `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload/pg_1,w_300,h_400,c_fill/${m.pdf_public_id}.jpg`;

      return {
        ...m,
        portada_url
      };

    });

    res.json({
      success: true,
      data: magazinesWithCover
    });

  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};


/* =====================================
   PURCHASE
===================================== */
export const purchaseMagazine = async (req, res) => {
  try {

    const id_usuario = req.user.id_usuario;
    const { id_magazine, payment_method } = req.body;

    if (!id_magazine || !payment_method) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const result = await service.processPurchase({
      id_usuario,
      id_magazine,
      payment_method
    });

    res.json(result);

  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const getSecurePdf = async (req, res) => {
  try {

    const id_usuario = req.user.id_usuario;
    const id_magazine = req.params.id;

    const url = await service.getSecurePdf(id_usuario, id_magazine);

    res.json({ url });

  } catch (error) {
    res.status(403).json({ message: error.message });
  }
};

/* =====================================
   VIEW SECURE PDF
===================================== */
export const viewMagazine = async (req, res) => {
  try {

    const id_usuario = req.user.id_usuario;
    const id_magazine = Number(req.params.id);

    if (isNaN(id_magazine)) {
      return res.status(400).json({ error: 'Invalid magazine id' });
    }

    const secureUrl = await service.getSecurePdf(
      id_usuario,
      id_magazine
    );

    res.json({ url: secureUrl });

  } catch (error) {

    if (error.message === 'Access denied') {
      return res.status(403).json({ error: error.message });
    }

    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};


export const updateMagazine = async (req, res) => {
  try {

    const id = req.params.id;
    const { titulo, descripcion, precio, stock } = req.body;

    let pdf_public_id = null;

    if (req.files && req.files.pdf) {
      const pdfResult = await cloudinary.uploader.upload(
        req.files.pdf[0].path,
        {
          resource_type: 'raw',
          folder: 'magazines/revistas'
        }
      );

      pdf_public_id = pdfResult.public_id.replace('.pdf', '');
    }

    // 🔥 REGISTRAR AUDITORÍA SIN conn
    await registrarAuditoria({
      id_usuario: req.user.id_usuario,
      accion: 'UPDATE_REVISTA',
      descripcion: `Revista ID ${id} actualizada`,
      ip: req.ip,
      user_agent: req.headers['user-agent']
    });

    await service.updateMagazine({
      id,
      titulo,
      descripcion,
      precio,
      stock,
      pdf_public_id
    });

    res.json({ message: 'Magazine updated' });

  } catch (error) {
    console.error("Error updateMagazine:", error);
    res.status(500).json({ error: error.message });
  }
};


/* =====================================
   ADMIN - UPLOAD MAGAZINE (PDF)
===================================== */
export const uploadMagazine = async (req, res) => {

  let pdfPath;

  try {

    const { titulo, descripcion, precio, stock } = req.body;

    if (!titulo || !precio || !stock) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!req.files || !req.files.pdf) {
      return res.status(400).json({ error: 'PDF is required for new magazines' });
    }

    pdfPath = req.files.pdf[0].path;

    /* ===========================
       SUBIR PDF COMO IMAGE
    =========================== */

    const pdfResult = await cloudinary.uploader.upload(pdfPath, {
      resource_type: 'image',
      folder: 'magazines/revistas'
    });

    /* ===========================
       GUARDAR EN BD
    =========================== */

    await service.createMagazine({
      titulo,
      descripcion,
      precio: Number(precio),
      stock: Number(stock),
      pdf_public_id: pdfResult.public_id
    });

    res.json({ message: 'Magazine uploaded successfully' });

  } catch (error) {

    console.error(error);
    res.status(500).json({ error: error.message });

  } finally {

    if (pdfPath && fs.existsSync(pdfPath)) {
      fs.unlinkSync(pdfPath);
    }
  }
};


export const getMyPurchases = async (req, res) => {
  try {
    const userId = req.user.id_usuario;

    const data = await service.getMyPurchases(userId);

    res.json(data);

  } catch (error) {
    console.error("Error en getMyPurchases:", error);
    res.status(500).json({ error: error.message });
  }
};


export const getAllMagazines = async (req, res) => {
  try {
    const data = await service.getAllMagazines();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const saveProgress = async (req, res) => {

  const id_usuario = req.user.id_usuario;
  const { id_magazine, page } = req.body;

  await service.saveReadingProgress(id_usuario, id_magazine, page);

  res.json({ success: true });
};

export const saveProgressController = async (req, res) => {
  const { id_magazine, page } = req.body;
  const userId = req.user.id;

  await poolPromise.query(
    `INSERT INTO progreso_lectura (id_usuario, id_revista, pagina)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE pagina = ?`,
    [userId, id_magazine, page, page]
  );

  res.json({ success: true });
};



export const toggleMagazineStatus = async (req, res) => {
  try {

    const id = req.params.id;

    // 1️⃣ Obtener estado actual
    const [rows] = await poolPromise.query(
      `SELECT estado FROM revistas WHERE id_revista = ?`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Revista no encontrada" });
    }

    const estadoActual = rows[0].estado;

    // 2️⃣ Determinar nuevo estado
    const nuevoEstado =
      estadoActual === 'Activa' ? 'Inactiva' : 'Activa';

    // 3️⃣ Actualizar estado
    await poolPromise.query(
      `UPDATE revistas SET estado = ? WHERE id_revista = ?`,
      [nuevoEstado, id]
    );

    // 4️⃣ Registrar auditoría
    await poolPromise.query(`
      INSERT INTO auditoria_compras
      (id_usuario, accion, descripcion, ip_address)
      VALUES (?, ?, ?, ?)
    `, [
      req.user.id_usuario,
      nuevoEstado === 'Activa'
        ? 'ACTIVAR_REVISTA'
        : 'DESACTIVAR_REVISTA',
      `Revista ID ${id} ${nuevoEstado.toLowerCase()}`,
      req.ip
    ]);

    res.json({
      message: `Revista ${nuevoEstado.toLowerCase()} correctamente`
    });

  } catch (error) {
    console.error("Error toggleMagazineStatus:", error);
    res.status(500).json({ error: error.message });
  }
};

    export const getMagazineById = async (req, res) => {
    try {
      const { id } = req.params;

      const magazine = await service.getById(id);

      if (!magazine) {
        return res.status(404).json({ message: 'Magazine not found' });
      }

      res.json({ data: magazine });

    } catch (error) {
      console.error("Error en getMagazineById:", error);
      res.status(500).json({ error: error.message });
    }
  };

 export const completePurchase = async (req, res) => {

  console.log("USER:", req.user);
  console.log("BODY:", req.body);

  const userId = req.user.id_usuario;
  const items = req.body.items;

  if (!items || items.length === 0) {
    return res.status(400).json({ message: "No hay productos para procesar" });
  }

  const pool = await poolPromise;
  const connection = await pool.getConnection();

  try {

    await connection.beginTransaction();

    const total = items.reduce((sum, item) => {
      return sum + Number(item.precio);
    }, 0);

    const [compraResult] = await connection.query(
      `INSERT INTO compras (id_usuario, total, estado)
       VALUES (?, ?, 'pagado')`,
      [userId, total]
    );

    const idCompra = compraResult.insertId;

    for (let item of items) {

      await connection.query(
        `INSERT INTO detalle_compra
         (id_compra, id_revista, precio_base, descuento_aplicado, precio_final)
         VALUES (?, ?, ?, 0, ?)`,
        [
          idCompra,
          item.id_revista || item.id,
          item.precio,
          item.precio
        ]
      );
    }

    await connection.query(
     `INSERT INTO pagos
    (id_compra, metodo, monto, estado, referencia)
    VALUES (?, 'credito', ?, 'aprobado', UUID())`,
      [idCompra, total]
    );

    // INSERTAR COMPRA EN auditoria_compras
    await connection.query(`
      INSERT INTO auditoria_compras
      (id_usuario, id_compra, accion, descripcion, ip_address, user_agent)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [
      userId,
      idCompra,
      'COMPRA',
      `Compra realizada correctamente por $${total}`,
      req.ip,
      req.headers['user-agent']
    ]);

    await connection.commit();

    res.json({ message: "Compra completada correctamente" });

  } catch (error) {

    await connection.rollback();
    console.error("ERROR COMPLETE PURCHASE:", error);
    res.status(500).json({ error: error.message });

  } finally {
    connection.release();
  }
};

// 🔥 1️⃣ Helper arriba del archivo (fuera de cualquier función)
export const registrarAuditoria = async ({
  id_usuario,
  accion,
  descripcion,
  ip,
  user_agent
}) => {

  await poolPromise.query(`
    INSERT INTO auditoria_compras
    (id_usuario, accion, descripcion, ip_address, user_agent)
    VALUES (?, ?, ?, ?, ?)
  `, [
    id_usuario,
    accion,
    descripcion,
    ip,
    user_agent
  ]);

};

export const createPurchase = async (req, res) => {

  const { items } = req.body;
  const userId = req.user.id_usuario;

  const conn = await poolPromise.getConnection();

  try {

    await conn.beginTransaction();

    const [result] = await conn.query(
      `INSERT INTO compras (id_usuario, estado)
       VALUES (?, 'pagado')`,
      [userId]
    );

    const idCompra = result.insertId;

    for (const item of items) {
      await conn.query(
        `INSERT INTO detalle_compra (id_compra, id_revista)
         VALUES (?, ?)`,
        [idCompra, item.id]
      );
    }

    // 🔥 INSERTAR EN auditoria_compras
    await connection.query(`
      INSERT INTO auditoria_compras
      (id_usuario, id_compra, accion, descripcion, ip_address, user_agent, fecha)
      VALUES (?, ?, 'COMPRA', ?, ?, ?, ?)
    `, [
      userId,
      idCompra,
      `Compra realizada correctamente por $${total}`,
      req.ip,
      req.headers['user-agent'],
      ahora
    ]);
    await conn.commit();

    res.json({ success: true });

  } catch (error) {

    await conn.rollback();
    res.status(500).json({ error: error.message });

  } finally {
    conn.release();
  }

};

export const getAuditoriaCompras = async (req, res) => {
  try {

    const { inicio, fecha_fin } = req.query;

      let query = `
        SELECT 
          a.id_auditoria,
          CONCAT(u.nombre, ' ', u.a_paterno) AS usuario,
          a.accion,
          a.descripcion,
          a.ip_address,
          a.fecha
        FROM auditoria_compras a
        JOIN usuarios u ON u.id_usuario = a.id_usuario
      `;

    const params = [];

    if (inicio && fecha_fin) {
      query += ` WHERE DATE(a.fecha) BETWEEN ? AND ? `;
      params.push(inicio, fecha_fin);
    }

    query += ` ORDER BY a.fecha DESC`;

    const [rows] = await poolPromise.query(query, params);

    res.json(rows);

  } catch (error) {
    console.error("Error auditoría:", error);
    res.status(500).json({ error: error.message });
  }
};
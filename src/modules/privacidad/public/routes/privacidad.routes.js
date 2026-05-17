import express from 'express';
import { poolPromise } from '../../../../config/db.config.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const [rows] = await poolPromise.execute(`
      SELECT id, seccion_numero, titulo, contenido, icono, orden, updated_at
      FROM politicas_privacidad
      WHERE activo = 1
      ORDER BY orden ASC, seccion_numero ASC
    `);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ message: 'Error al obtener políticas' });
  }
});

export default router;
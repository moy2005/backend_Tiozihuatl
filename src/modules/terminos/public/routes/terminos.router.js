import express from 'express';
import model from '../../models/terminos.model.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const [secciones, ultima] = await Promise.all([
      model.getAllPublic(),
      model.getUltimaActualizacion()
    ]);

    res.json({ 
      secciones, 
      ultima_actualizacion: ultima 
    });

  } catch (err) {
    console.error('❌ Error terminos public:', err);
    res.status(500).json({ message: 'Error al obtener términos' });
  }
});

export default router;
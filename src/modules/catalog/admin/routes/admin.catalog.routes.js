import express from 'express';
import controller from '../controllers/admin.catalog.controller.js';
// aquí luego irá adminGuard

const router = express.Router();

router.post('/libros', controller.crearLibro);
router.get('/libros', controller.listarLibros);

router.put('/libros/:id', controller.updateLibro);
router.patch('/libros/:id/estado', controller.cambiarEstado);

router.post('/upload-pdf', controller.subirPdf);

export default router;

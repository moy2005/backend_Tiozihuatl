import express from 'express';
import controller from '../controllers/catalog.controller.js';

const router = express.Router();

router.get('/', controller.getCatalog);
router.get('/materias',controller.getMaterias);
router.get('/libros/:id/pdf', controller.verPdf);
router.get('/libros/:id/preview', controller.preview);

export default router;

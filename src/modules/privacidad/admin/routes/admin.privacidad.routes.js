import express from 'express';
import controller from '../controllers/admin.privacidad.controller.js';
import { authMiddleware } from '../../../../core/middleware/auth.middleware.js';
import { roleMiddleware } from '../../../../core/middleware/role.middleware.js';

const router = express.Router();

router.get('/', authMiddleware, roleMiddleware(['Administrador']), controller.listar);
router.post('/', authMiddleware, roleMiddleware(['Administrador']), controller.crear);
router.put('/:id', authMiddleware, roleMiddleware(['Administrador']), controller.actualizar);
router.patch('/:id/estado', authMiddleware, roleMiddleware(['Administrador']), controller.cambiarEstado);
router.delete('/:id', authMiddleware, roleMiddleware(['Administrador']), controller.eliminar);

export default router;


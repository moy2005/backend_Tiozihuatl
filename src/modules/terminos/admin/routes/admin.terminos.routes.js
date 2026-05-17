import express from 'express';
import controller from '../controllers/admin.terminos.controller.js';
import { authMiddleware }  from '../../../../core/middleware/auth.middleware.js';
import { roleMiddleware }  from '../../../../core/middleware/role.middleware.js';

const router = express.Router();

const auth  = [authMiddleware, roleMiddleware(['Administrador'])];

router.get('/', authMiddleware, roleMiddleware(['Administrador']), controller.listar);
router.get('/:id', authMiddleware, roleMiddleware(['Administrador']), controller.obtener);
router.post('/', authMiddleware, roleMiddleware(['Administrador']), controller.crear);
router.put('/:id', authMiddleware, roleMiddleware(['Administrador']), controller.actualizar);
router.patch('/:id/estado', authMiddleware, roleMiddleware(['Administrador']), controller.cambiarEstado);
router.delete('/:id', authMiddleware, roleMiddleware(['Administrador']), controller.eliminar);

export default router;


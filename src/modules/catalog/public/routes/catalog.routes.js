import express from 'express';
import catalogController from '../controllers/catalog.controller.js';
import { authMiddleware } from "../../../../core/middleware/auth.middleware.js";
import { roleMiddleware } from "../../../../core/middleware/role.middleware.js";

const router = express.Router();

router.get( "/", catalogController.getCatalog);
router.get("/materias", catalogController.getMaterias);
router.get("/libros/:id/pdf-url", catalogController.getPdfUrl);
router.get("/libros/:id/preview",  catalogController.preview);
router.get("/semestres", catalogController.getSemestres);

export default router;

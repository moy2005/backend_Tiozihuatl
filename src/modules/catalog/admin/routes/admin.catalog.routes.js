import express from 'express';
import controller from '../controllers/admin.catalog.controller.js';
import { authMiddleware } from "../../../../core/middleware/auth.middleware.js";
import { roleMiddleware } from "../../../../core/middleware/role.middleware.js";

const router = express.Router();

router.get("/libros",authMiddleware, roleMiddleware(["Administrador"]), controller.listarLibros);
router.post("/libros",authMiddleware, roleMiddleware(["Administrador"]), controller.crearLibro);
router.put("/libros/:id", authMiddleware, roleMiddleware(["Administrador"]), controller.updateLibro);
router.patch("/libros/:id/estado",authMiddleware,roleMiddleware(["Administrador"]), controller.cambiarEstado);
router.post( "/upload-pdf",authMiddleware,roleMiddleware(["Administrador"]), controller.subirPdf);

export default router;


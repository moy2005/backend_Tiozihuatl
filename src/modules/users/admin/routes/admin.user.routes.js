import { Router } from "express";
import { AdminUserController } from "../controllers/admin.user.controller.js";
import { authMiddleware } from "../../../../core/middleware/auth.middleware.js";
import { roleMiddleware } from "../../../../core/middleware/role.middleware.js";
import { validateUserFields } from "../../../../core/middleware/validateUserFields.middleware.js";
import { uploadExcel } from "../../../../core/middleware/uploadExcel.middleware.js";
import { PeriodoController } from "../controllers/periodo.controller.js";
import { ActivationController } from "../../../auth/controllers/activation.controller.js";

const router = Router();

// Solo administradores autenticados
router.post("/regenerar-token/:id",authMiddleware,roleMiddleware(["Administrador"]),ActivationController.regenerateToken);
router.get("/", authMiddleware, roleMiddleware(["Administrador"]), AdminUserController.getAll);
router.post("/", authMiddleware, roleMiddleware(["Administrador"]), validateUserFields, AdminUserController.create);
router.put("/:id", authMiddleware, roleMiddleware(["Administrador"]), validateUserFields, AdminUserController.update);
router.delete("/:id", authMiddleware, roleMiddleware(["Administrador"]), AdminUserController.delete);
router.get("/roles/all", authMiddleware, roleMiddleware(["Administrador"]), AdminUserController.getRoles);
router.get("/carreras",authMiddleware,roleMiddleware(["Administrador"]),AdminUserController.getCarreras);
router.get("/semestres",authMiddleware,roleMiddleware(["Administrador"]),AdminUserController.getSemestres);
router.post("/import-preview",authMiddleware,roleMiddleware(["Administrador"]),uploadExcel.single("file"),AdminUserController.previewImportUsers);
router.post("/import",authMiddleware,roleMiddleware(["Administrador"]),uploadExcel.single("file"),AdminUserController.importUsers);
router.get("/template",authMiddleware,roleMiddleware(["Administrador"]),AdminUserController.downloadTemplate);
router.post("/avanzar-semestre",authMiddleware,roleMiddleware(["Administrador"]),AdminUserController.avanzarSemestre);
router.get('/avanzar-preview', authMiddleware, roleMiddleware(["Administrador"]), AdminUserController.getPreviewAvance);
router.get("/filtros",authMiddleware,roleMiddleware(["Administrador"]),AdminUserController.getFiltered);
router.get("/periodos",authMiddleware,roleMiddleware(["Administrador"]),PeriodoController.getAll);
router.get("/periodos/activo",authMiddleware,roleMiddleware(["Administrador"]),PeriodoController.getActivo);
router.get('/filtros-opciones', authMiddleware, roleMiddleware(["Administrador"]), AdminUserController.getOpcionesPorPeriodo);

export default router;


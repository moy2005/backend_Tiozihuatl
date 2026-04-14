import { Router } from "express";
import {createMaterial, getMyMaterials, deleteMaterial, updateMaterial, changeStatus, getMaterialById} from "../controllers/docente.material.controller.js";
import { authMiddleware } from "../../../../core/middleware/auth.middleware.js";
import { roleMiddleware } from "../../../../core/middleware/role.middleware.js";
import { uploadMaterial } from "../../../../core/middleware/uploadMaterial.middleware.js";

const router = Router();

router.use(authMiddleware);
router.post("/", roleMiddleware(["Docente"]), uploadMaterial.single("file"), createMaterial);
router.get( "/mis-materiales", roleMiddleware(["Docente"]),getMyMaterials);
router.delete("/:id", roleMiddleware(["Docente"]), deleteMaterial);
router.put("/:id", roleMiddleware(["Docente"]), uploadMaterial.single("file"), updateMaterial);
router.patch("/:id/estado", roleMiddleware(["Docente"]), changeStatus);
router.get("/:id", roleMiddleware(["Docente"]), getMaterialById);

export default router;
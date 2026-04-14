import { Router } from "express";
import { authMiddleware } from "../../../../core/middleware/auth.middleware.js";
import { roleMiddleware } from "../../../../core/middleware/role.middleware.js";
import { uploadMaterial } from "../../../../core/middleware/uploadMaterial.middleware.js";
import { 
  createMaterial, 
  getMyMaterials, 
  deleteMaterial, 
  updateMaterial, 
  changeStatus, 
  getMaterialById, 
  getAllMaterials  // ← solo agrega esto al import existente
} from "../controllers/admin.material.controller.js";
const router = Router();

router.use((req, res, next) => {
  console.log("🚦 Entrando al router admin, path:", req.path);
  next();
});
router.use(authMiddleware);
router.get("/todos", roleMiddleware(["Administrador"]), getAllMaterials);
router.post("/", roleMiddleware(["Docente", "Administrador"]), uploadMaterial.single("file"), createMaterial);
router.get( "/mis-materiales", roleMiddleware(["Docente", "Administrador"]),getMyMaterials);
router.delete("/:id", roleMiddleware(["Docente", "Administrador"]), deleteMaterial);
router.put("/:id", roleMiddleware(["Docente", "Administrador"]), uploadMaterial.single("file"), updateMaterial);
router.patch("/:id/estado", roleMiddleware(["Docente", "Administrador"]), changeStatus);
router.get("/:id", roleMiddleware(["Docente", "Administrador"]), getMaterialById);

export default router;
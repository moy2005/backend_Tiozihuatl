import { Router } from "express";
import publicRoutes from "./public/routes/material.routes.js";
import docenteRoutes from "./docente/routes/docente.material.routes.js"
import adminRoutes from "./admin/routes/admin.material.routes.js"

const router = Router();
router.use("/admin", adminRoutes);
router.use("/docente", docenteRoutes); 
router.use("/", publicRoutes);

export default router;
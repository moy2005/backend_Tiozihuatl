import express from "express";
import profileRoutes from "./common/routes/profile.routes.js";
import adminUserRoutes from "./admin/routes/admin.user.routes.js";

const router = express.Router();

// Rutas comunes (perfil del usuario autenticado)
router.use("/profile", profileRoutes);

// Rutas administrativas (solo Admin)
router.use("/admin", adminUserRoutes);

export default router;


import express from "express";
import publicHelpRoutes from "./public/routes/public.help.routes.js";
import adminHelpRoutes from "./admin/routes/admin.help.routes.js";

const router = express.Router();

// Rutas públicas (Ayuda / FAQ)
router.use("/", publicHelpRoutes);

// Rutas administrativas (gestión de FAQ)
router.use("/admin", adminHelpRoutes);

export default router;


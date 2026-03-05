import express from "express";
import publicNewsRoutes from "./public/routes/public.news.routes.js";
import adminNewsRoutes from "./admin/routes/admin.news.routes.js";

const router = express.Router();

// Rutas públicas (Noticias)
router.use("/", publicNewsRoutes);
// Rutas administrativas (gestión de Noticias)
router.use("/admin", adminNewsRoutes);

export default router;
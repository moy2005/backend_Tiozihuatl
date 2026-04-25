import express from "express";
import publicNewsRoutes from "./public/routes/public.news.routes.js";
import adminNewsRoutes from "./admin/routes/admin.news.routes.js";

const router = express.Router();

// Rutas administrativas (gestion de noticias)
router.use("/admin", adminNewsRoutes);
// Rutas publicas (noticias)
router.use("/", publicNewsRoutes);

export default router;

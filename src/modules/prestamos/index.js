import express from "express";
import publicRoutes from "./public/routes/public.prestamo.routes.js";
import adminRoutes from "./admin/routes/admin.prestamo.routes.js";

const router = express.Router();

router.use("/", publicRoutes);
router.use("/admin", adminRoutes);

export default router;
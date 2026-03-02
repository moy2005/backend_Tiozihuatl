import { Router } from "express";
import adminRoutes from "./admin/routes/admin.calendar.routes.js";
import publicRoutes from "./public/routes/public.calendar.routes.js";

const router = Router();

router.use("/", publicRoutes);
router.use("/admin", adminRoutes);

export default router;

import { Router } from "express";
import adminRoutes from "./admin/routes/admin.calendar.routes.js";
import publicCalendarRoutes from "./public/routes/public.calendar.routes.js";

const router = Router();

router.use("/api/calendarios", publicCalendarRoutes);
router.use("/admin", adminRoutes);

export default router;

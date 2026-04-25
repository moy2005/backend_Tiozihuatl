import express from "express";
import adminRoutes from "./admin/routes/admin.events.routes.js";
import publicRoutes from "./public/routes/events.routes.js";

const router = express.Router();

router.use("/admin", adminRoutes);
router.use("/", publicRoutes);

export default router;
import express from "express";
import publicContactRoutes from "./public/routes/public.contact.routes.js";
import adminContactRoutes from "./admin/routes/admin.contact.routes.js";

const router = express.Router();

router.use("/", publicContactRoutes);
router.use("/admin", adminContactRoutes);

export default router;

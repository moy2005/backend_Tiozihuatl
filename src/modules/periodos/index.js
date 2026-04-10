import { Router } from "express";
import adminRoutes from "./admin/routes/periodos.routes.js";

const router = Router();

  router.use("/", adminRoutes);

export default router;

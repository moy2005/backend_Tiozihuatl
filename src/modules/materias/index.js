import { Router } from "express";
import adminRoutes from "./admin/routes/materias.routes.js";

const router = Router();

  router.use("/", adminRoutes);

export default router;

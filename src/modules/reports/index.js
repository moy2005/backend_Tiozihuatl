import { Router } from "express";
import reportsRoutes from "./routes/reports.routes.js";

const router = Router();
router.use("/", reportsRoutes);

export default router;

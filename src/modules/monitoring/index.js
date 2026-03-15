import express from "express";
import monitoringRoutes from "./routes/monitoring.routes.js";

const router = express.Router();

// Rutas de monitoreo
router.use("/", monitoringRoutes);

export default router;
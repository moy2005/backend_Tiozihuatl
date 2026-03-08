import automationRoutes from "./routes/automation.routes.js";
import express from "express";

const router = express.Router();

// Rutas de respaldos
router.use("/", automationRoutes);

export default router;


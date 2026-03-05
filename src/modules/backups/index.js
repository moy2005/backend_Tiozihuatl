import backupRoutes from "./routes/backup.routes.js";
import express from "express";

const router = express.Router();

// Rutas de respaldos
router.use("/", backupRoutes);

export default router;


import express from "express";
import assistantRoutes from "./routes/assistant.routes.js";

const router = express.Router();

router.use("/", assistantRoutes);

export default router;

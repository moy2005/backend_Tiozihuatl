import { Router } from "express";
import publicRoutes from "./public/routes/prediction.routes.js";

const router = Router();

router.use("/", publicRoutes);

export default router;
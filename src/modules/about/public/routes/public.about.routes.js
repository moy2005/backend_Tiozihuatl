import { Router } from "express";
import { PublicAboutController } from "../controllers/public.about.controller.js";

const router = Router();

router.get("/", PublicAboutController.get);

export default router;

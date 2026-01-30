import { Router } from "express";
import { PublicHelpController } from "../controllers/public.help.controller.js";

const router = Router();

// Acceso público
router.get("/", PublicHelpController.getFaqs);

export default router;

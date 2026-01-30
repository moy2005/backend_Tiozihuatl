import { Router } from "express";
import { PublicContactController } from "../controllers/public.contact.controller.js";

const router = Router();

router.get("/", PublicContactController.getInfo);

export default router;

import { Router } from "express";
import { PublicNewsController } from "../controllers/public.news.controller.js";


const router = Router();

router.get(
  "/", PublicNewsController.getPublicNews
);
router.get(
  "/:id", PublicNewsController.getPublicNewsById
);

export default router;

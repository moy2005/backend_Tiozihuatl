import { Router } from "express";
import { optionalAuth } from "../../../core/middleware/auth.middleware.js";
import { AssistantController } from "../controllers/assistant.controller.js";

const router = Router();

router.get("/topics", AssistantController.topics);
router.post("/message", optionalAuth, AssistantController.message);

export default router;

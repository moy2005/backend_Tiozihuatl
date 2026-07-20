import { Router } from "express";
import { AssistantController } from "../controllers/assistant.controller.js";

const router = Router();

router.get("/topics", AssistantController.topics);
router.post("/message", AssistantController.message);

export default router;

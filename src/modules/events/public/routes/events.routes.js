import { Router } from "express";
import { EventsController } from "../controllers/events.controller.js";

const router = Router();

router.get("/", EventsController.getAll);
router.get("/:id", EventsController.getById);

export default router;

import { Router } from "express";
import * as Controller from "../controllers//admin.calendar.controller.js";

const router = Router();

router.post("/", Controller.createCalendar);
router.get("/", Controller.getCalendars);
router.put("/:id", Controller.updateCalendar);
router.put("/:id/status", Controller.toggleStatus);
router.delete("/:id", Controller.deleteCalendar);

export default router;

import { Router } from "express";
import * as Controller from "../controllers/public.calendar.controller.js";

const router = Router();

router.get("/", Controller.getActiveCalendar);

export default router;

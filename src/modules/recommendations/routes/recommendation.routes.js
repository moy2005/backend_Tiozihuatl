import express from "express";
import { recommendationsForBook } from "../controllers/recommendation.controller.js";

const router = express.Router();

router.get("/books/:id", recommendationsForBook);

export default router;

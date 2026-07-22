import express from "express";
import { recommendationsForBook } from "../controllers/recommendation.controller.js";
import { studentClusterShelves } from "../controllers/clustering.controller.js";
import { authMiddleware } from "../../../core/middleware/auth.middleware.js";

const router = express.Router();

router.get("/clusters/student", authMiddleware, studentClusterShelves);
router.get("/books/:id", authMiddleware, recommendationsForBook);

export default router;

import { Router } from "express";
import { AdminNewsController } from "../controllers/admin.news.controller.js";
import { authMiddleware } from "../../../../core/middleware/auth.middleware.js";
import { roleMiddleware } from "../../../../core/middleware/role.middleware.js";
import { upload } from "../../../../core/middleware/upload.middleware.js";

const router = Router();

router.get("/",authMiddleware,roleMiddleware(["Administrador"]),AdminNewsController.getAll);
router.post("/",authMiddleware,roleMiddleware(["Administrador"]),
  upload.fields([
    { name: "imagen", maxCount: 1 },
    { name: "video", maxCount: 1 }
  ]),
  AdminNewsController.create
);
router.put("/:id",authMiddleware,roleMiddleware(["Administrador"]),
  upload.fields([
    { name: "imagen", maxCount: 1 },
    { name: "video", maxCount: 1 }
  ]),
  AdminNewsController.update
);
router.delete("/:id",authMiddleware,roleMiddleware(["Administrador"]),AdminNewsController.delete);

export default router;

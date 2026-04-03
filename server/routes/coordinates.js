import { Router } from "express";
import { index, update, remove } from "../controllers/coordinateController.js";

const router = Router();

router.get("/", index);
router.post("/", update);
router.delete("/", remove);

export default router;

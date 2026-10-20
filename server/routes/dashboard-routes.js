import { Router } from "express";
import { get } from "../controllers/dashboard-controller.js";

const router = Router();
router.get("/", get);

export default router;

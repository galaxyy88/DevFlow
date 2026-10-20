import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import * as auth from "../controllers/auth-controller.js";
import { authenticate } from "../middleware/authenticate.js";
import { validate } from "../middleware/validate.js";
import { loginSchema, registerSchema } from "../utils/validation.js";

const router = Router();
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: { code: "RATE_LIMITED", message: "Muitas tentativas. Tente novamente em alguns minutos." } }
});

router.post("/register", authLimiter, validate(registerSchema), auth.register);
router.post("/login", authLimiter, validate(loginSchema), auth.login);
router.post("/logout", authenticate, auth.logout);
router.get("/me", authenticate, auth.currentUser);

export default router;

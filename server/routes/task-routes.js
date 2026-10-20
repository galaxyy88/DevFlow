import { Router } from "express";
import * as tasks from "../controllers/task-controller.js";
import { validate } from "../middleware/validate.js";
import { ApiError } from "../utils/api-error.js";
import { updateTaskSchema, uuidSchema } from "../utils/validation.js";

const router = Router();

router.param("id", (request, response, next, id) => {
  const result = uuidSchema.safeParse(id);
  if (!result.success) {
    return next(new ApiError(400, "Identificador inválido.", "VALIDATION_ERROR"));
  }
  return next();
});

router.put("/:id", validate(updateTaskSchema), tasks.update);
router.delete("/:id", tasks.remove);

export default router;

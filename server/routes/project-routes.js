import { Router } from "express";
import * as projects from "../controllers/project-controller.js";
import * as tasks from "../controllers/task-controller.js";
import { validate } from "../middleware/validate.js";
import { ApiError } from "../utils/api-error.js";
import {
  createProjectSchema,
  createTaskSchema,
  projectListQuerySchema,
  taskListQuerySchema,
  updateProjectSchema,
  uuidSchema
} from "../utils/validation.js";

const router = Router();

router.param("id", (request, response, next, id) => {
  const result = uuidSchema.safeParse(id);
  if (!result.success) {
    return next(new ApiError(400, "Identificador inválido.", "VALIDATION_ERROR"));
  }
  return next();
});

router.get("/", validate(projectListQuerySchema, "query"), projects.list);
router.post("/", validate(createProjectSchema), projects.create);
router.get("/:id", projects.get);
router.put("/:id", validate(updateProjectSchema), projects.update);
router.delete("/:id", projects.remove);
router.get("/:id/tasks", validate(taskListQuerySchema, "query"), tasks.listByProject);
router.post("/:id/tasks", validate(createTaskSchema), tasks.create);

export default router;

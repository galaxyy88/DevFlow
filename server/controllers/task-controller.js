import { asyncHandler } from "../utils/async-handler.js";
import * as tasks from "../services/task-service.js";

export const listByProject = asyncHandler(async (request, response) => {
  response.json(await tasks.listProjectTasks(request.user.id, request.params.id, request.validatedQuery));
});

export const create = asyncHandler(async (request, response) => {
  response.status(201).json({
    task: await tasks.createTask(request.user.id, request.params.id, request.body)
  });
});

export const update = asyncHandler(async (request, response) => {
  response.json({ task: await tasks.updateTask(request.user.id, request.params.id, request.body) });
});

export const remove = asyncHandler(async (request, response) => {
  await tasks.deleteTask(request.user.id, request.params.id);
  response.status(204).end();
});

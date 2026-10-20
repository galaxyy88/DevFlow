import { asyncHandler } from "../utils/async-handler.js";
import * as projects from "../services/project-service.js";

export const list = asyncHandler(async (request, response) => {
  response.json(await projects.listProjects(request.user.id, request.validatedQuery));
});

export const get = asyncHandler(async (request, response) => {
  response.json({ project: await projects.getProject(request.user.id, request.params.id) });
});

export const create = asyncHandler(async (request, response) => {
  response.status(201).json({
    project: await projects.createProject(request.user.id, request.body)
  });
});

export const update = asyncHandler(async (request, response) => {
  response.json({
    project: await projects.updateProject(request.user.id, request.params.id, request.body)
  });
});

export const remove = asyncHandler(async (request, response) => {
  await projects.deleteProject(request.user.id, request.params.id);
  response.status(204).end();
});

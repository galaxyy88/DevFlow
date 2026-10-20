import { asyncHandler } from "../utils/async-handler.js";
import { loginUser, logoutUser, registerUser } from "../services/auth-service.js";

export const register = asyncHandler(async (request, response) => {
  const result = await registerUser(request.body);
  response.status(201).json(result);
});

export const login = asyncHandler(async (request, response) => {
  response.json(await loginUser(request.body));
});

export const logout = asyncHandler(async (request, response) => {
  await logoutUser(request.user.id);
  response.status(204).end();
});

export const currentUser = (request, response) => {
  response.json({ user: request.user });
};

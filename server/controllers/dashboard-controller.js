import { asyncHandler } from "../utils/async-handler.js";
import { getDashboard } from "../services/dashboard-service.js";

export const get = asyncHandler(async (request, response) => {
  response.json(await getDashboard(request.user.id));
});

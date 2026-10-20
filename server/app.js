import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import helmet from "helmet";
import { env } from "./config/env.js";
import { authenticate } from "./middleware/authenticate.js";
import { errorHandler, notFound } from "./middleware/error-handler.js";
import authRoutes from "./routes/auth-routes.js";
import dashboardRoutes from "./routes/dashboard-routes.js";
import projectRoutes from "./routes/project-routes.js";
import taskRoutes from "./routes/task-routes.js";
import { asyncHandler } from "./utils/async-handler.js";
import { pool } from "./database/pool.js";

const app = express();
const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const clientDirectory = path.resolve(currentDirectory, "../client");

app.disable("x-powered-by");
app.set("trust proxy", env.NODE_ENV === "production" ? 1 : false);
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      "style-src": ["'self'", "https://fonts.googleapis.com"],
      "font-src": ["'self'", "https://fonts.gstatic.com"]
    }
  }
}));
app.use(express.json({ limit: "20kb" }));

const healthCheck = asyncHandler(async (request, response) => {
  await pool.query("SELECT 1");
  response.json({ status: "ok" });
});

app.get("/health", healthCheck);
app.get("/api/health", healthCheck);
app.use("/api/auth", authRoutes);
app.use("/api", authenticate);
app.use("/api/projects", projectRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api", notFound);
app.use(express.static(clientDirectory));
app.use(notFound);
app.use(errorHandler);

export default app;

import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { pool } from "../database/pool.js";
import { ApiError } from "../utils/api-error.js";

export async function authenticate(request, response, next) {
  const authorization = request.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return next(new ApiError(401, "Autenticação necessária.", "UNAUTHORIZED"));
  }

  try {
    const payload = jwt.verify(authorization.slice(7), env.JWT_SECRET);

    if (typeof payload === "string" || typeof payload.sub !== "string" || !Number.isInteger(payload.version)) {
      throw new Error("Token inválido.");
    }

    const result = await pool.query(
      "SELECT id, name, email, token_version FROM users WHERE id = $1",
      [payload.sub]
    );

    if (!result.rowCount || result.rows[0].token_version !== payload.version) {
      return next(new ApiError(401, "Sessão inválida ou expirada.", "UNAUTHORIZED"));
    }

    request.user = {
      id: result.rows[0].id,
      name: result.rows[0].name,
      email: result.rows[0].email
    };
    return next();
  } catch (error) {
    if (error instanceof ApiError) {
      return next(error);
    }

    if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
      return next(new ApiError(401, "Sessão inválida ou expirada.", "UNAUTHORIZED"));
    }

    return next(error);
  }
}

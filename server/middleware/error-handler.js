import { ApiError } from "../utils/api-error.js";

export function notFound(request, response, next) {
  next(new ApiError(404, "Recurso não encontrado.", "NOT_FOUND"));
}

export function errorHandler(error, request, response, next) {
  if (response.headersSent) {
    return next(error);
  }

  if (error.type === "entity.parse.failed") {
    return response.status(400).json({
      error: { code: "INVALID_JSON", message: "O corpo da solicitação contém JSON inválido." }
    });
  }

  if (error.type === "entity.too.large") {
    return response.status(413).json({
      error: { code: "PAYLOAD_TOO_LARGE", message: "O corpo da solicitação excede o limite permitido." }
    });
  }

  if (error.code === "23505") {
    return response.status(409).json({
      error: { code: "CONFLICT", message: "Já existe um cadastro com esses dados." }
    });
  }

  if (error.code === "23503" || error.code === "23514") {
    return response.status(400).json({
      error: { code: "CONSTRAINT_VIOLATION", message: "Os dados não atendem às regras do sistema." }
    });
  }

  if (error instanceof ApiError) {
    return response.status(error.status).json({
      error: { code: error.code, message: error.message }
    });
  }

  if (process.env.NODE_ENV === "production") {
    console.error("Erro não tratado na API:", { code: error.code });
  } else {
    console.error("Erro não tratado na API:", error);
  }
  return response.status(500).json({
    error: { code: "INTERNAL_ERROR", message: "Ocorreu um erro interno. Tente novamente." }
  });
}

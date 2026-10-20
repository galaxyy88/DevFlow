import { ApiError } from "../utils/api-error.js";

export function validate(schema, source = "body") {
  return (request, response, next) => {
    const result = schema.safeParse(request[source]);

    if (!result.success) {
      return next(new ApiError(400, "Os dados enviados são inválidos.", "VALIDATION_ERROR"));
    }

    if (source === "query") {
      request.validatedQuery = result.data;
    } else {
      request[source] = result.data;
    }
    return next();
  };
}

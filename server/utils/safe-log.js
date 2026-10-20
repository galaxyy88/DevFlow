const SAFE_ERROR_CODE = /^[A-Z0-9_]{1,32}$/;
const SAFE_ERROR_NAME = /^[A-Za-z]{1,40}Error$/;

export function logSafeError(context, error) {
  const details = {};

  if (typeof error?.name === "string" && SAFE_ERROR_NAME.test(error.name)) {
    details.name = error.name;
  }

  if (typeof error?.code === "string" && SAFE_ERROR_CODE.test(error.code)) {
    details.code = error.code;
  }

  console.error(context, details);
}

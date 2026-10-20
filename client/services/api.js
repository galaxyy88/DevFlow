const API_ROOT = "/api";

export class ApiError extends Error {
  constructor(message, status, code) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export async function request(path, { method = "GET", body, token = getToken() } = {}) {
  const headers = new Headers();
  if (body !== undefined) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  let response;
  try {
    response = await fetch(`${API_ROOT}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body)
    });
  } catch {
    throw new ApiError("Não foi possível conectar ao servidor.", 0, "NETWORK_ERROR");
  }

  if (response.status === 204) return null;

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(
      data?.error?.message || "Não foi possível concluir a solicitação.",
      response.status,
      data?.error?.code || "REQUEST_ERROR"
    );
  }
  return data;
}

export function getToken() {
  return localStorage.getItem("devflow_token");
}

export function saveToken(token) {
  localStorage.setItem("devflow_token", token);
}

export function clearToken() {
  localStorage.removeItem("devflow_token");
}

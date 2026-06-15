const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";
const TOKEN_KEY = "dokoboard_token";

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

// One error type the whole app understands.
export class ApiError extends Error {
  status: number;
  details?: string[];

  constructor(status: number, message: string, details?: string[]) {
    super(message);

    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

// Normalizes the default Nest shape (message: string | string[])
// AND the standardized shape (message + details). Works either way.
function normalizeError(status: number, body: unknown): ApiError {
  if (body && typeof body === "object") {
    const b = body as { message?: string | string[]; details?: string[] };
    if (Array.isArray(b.message)) {
      return new ApiError(status, "Validation failed", b.message);
    }
    if (typeof b.message === "string") {
      return new ApiError(status, b.message, b.details);
    }
  }
  return new ApiError(status, "Something went wrong");
}

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { method = "GET", body } = options;
  const token = tokenStore.get();

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  // Token expired/invalid: drop it. The auth layer reacts and redirects.
  if (res.status === 401) {
    tokenStore.clear();
  }

  if (res.status === 204) {
    return undefined as T; // No Content (our DELETE endpoints)
  }

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw normalizeError(res.status, data);
  }

  return data as T;
}

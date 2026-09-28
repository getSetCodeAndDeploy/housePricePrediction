/** Shared fetch helper: one error shape for every backend ({detail, errors?}). Works on server and client. */

export interface FieldIssue {
  field: string;
  message: string;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public errors?: FieldIssue[],
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, init);
  } catch {
    throw new ApiError("Could not reach the service. Please try again.", 503);
  }
  if (!res.ok) {
    let detail = `Request failed (${res.status})`;
    let errors: FieldIssue[] | undefined;
    try {
      const body = await res.json();
      if (typeof body?.detail === "string") detail = body.detail;
      if (Array.isArray(body?.errors)) errors = body.errors;
    } catch {
      /* non-JSON error body: keep generic message */
    }
    throw new ApiError(detail, res.status, errors);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

/** Browser-side helpers: always go through the portal's own /api proxy (no CORS, no internal hostnames). */
export const app1 = (path: string) => `/api/app1${path}`;
export const app2 = (path: string) => `/api/app2${path}`;

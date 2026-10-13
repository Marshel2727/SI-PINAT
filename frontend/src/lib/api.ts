import type { Envelope } from "@/types/api";

export class ApiError extends Error {
  constructor(message: string, public status: number, public details: unknown[] = []) {
    super(message);
  }
}

let csrfPromise: Promise<string> | null = null;

let csrfTime = 0;

const CSRF_CACHE_MS = 100 * 60 * 1000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

async function csrf(): Promise<string> {
  if (!csrfPromise || Date.now() - csrfTime > CSRF_CACHE_MS) {
    csrfTime = Date.now();
    csrfPromise = fetch("/api/v1/auth/csrf", {
      credentials: "same-origin",
      cache: "no-store",
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Layanan belum dapat dihubungi.");
        }
        const value = (await response.json()) as Envelope<{
          csrf_token: string;
        }>;
        return value.data.csrf_token;
      })
      .catch((error: unknown) => {
        csrfPromise = null;
        throw error;
      });
  }
  return csrfPromise;
}

export async function api<T = unknown>(path: string, init: RequestInit = {}, retry = true): Promise<Envelope<T>> {
  const headers = new Headers(init.headers);
  const method = (init.method || "GET").toUpperCase();
  if (!["GET", "HEAD"].includes(method)) {
    headers.set("X-CSRF-Token", await csrf());
    if (init.body && !(init.body instanceof FormData)) {
      headers.set("Content-Type", "application/json");
    }
  }
  let response: Response;
  try {
    response = await fetch("/api/v1" + path, {
      ...init,
      headers,
      credentials: "same-origin",
      cache: "no-store",
    });
  }
  catch {
    throw new ApiError("Layanan belum dapat dihubungi. Periksa koneksi dan coba lagi.", 0);
  }
  if (response.status === 204) {
    return { data: null as T };
  }
  const value: unknown = await response.json().catch(() => ({
    error: { message: "Respons layanan tidak valid." },
  }));
  if (!response.ok) {
    const error = isRecord(value) && isRecord(value.error) ? value.error : {};
    if (response.status === 403 && error.code === "CSRF" && retry) {
      csrfPromise = null;
      return api<T>(path, init, false);
    }
    throw new ApiError(typeof error.message === "string" ? error.message : "Permintaan gagal.", response.status, Array.isArray(error.details) ? error.details : []);
  }
  return value as Envelope<T>;
}

export function send<T = unknown>(path: string, body?: unknown, method = "POST"): Promise<Envelope<T>> {
  return api<T>(path, {
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

export function prettyError(value: unknown): string {
  return value instanceof Error ? value.message : "Terjadi kesalahan.";
}

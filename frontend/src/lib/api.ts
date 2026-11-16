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

let adminUnauthorizedHandler: (() => void) | null = null;

export function setAdminUnauthorizedHandler(handler: (() => void) | null): void {
  adminUnauthorizedHandler = handler;
}

export function onAdminUnauthorized(handler: (() => void) | null): () => void {
  adminUnauthorizedHandler = handler;
  return () => {
    if (adminUnauthorizedHandler === handler) {
      adminUnauthorizedHandler = null;
    }
  };
}

function isProtectedAdminPath(path: string): boolean {
  return path.startsWith("/admin") || (path.startsWith("/auth/") && path !== "/auth/login" && path !== "/auth/logout");
}

function notifyUnauthorized(path: string, status: number): void {
  if (status === 401 && isProtectedAdminPath(path)) {
    adminUnauthorizedHandler?.();
  }
}

export function formatApiField(field: string): string {
  const segments = field.split(".").filter(Boolean);
  const trimmed = segments.length > 1 && ["body", "query", "path"].includes(segments[0]) ? segments.slice(1) : segments;
  return trimmed
    .map((segment) => (/^\d+$/.test(segment) ? `Baris ${Number(segment) + 1}` : segment))
    .join(" · ");
}

export function formatApiDetail(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  if (!isRecord(value)) {
    return "Periksa kembali data yang dimasukkan.";
  }

  const parts: string[] = [];

  if (value.row) {
    parts.push("Baris " + String(value.row) + (value.kode_mk ? " (" + String(value.kode_mk) + ")" : ""));
  }
  if (typeof value.message === "string") {
    const fieldLabel = typeof value.field === "string" ? formatApiField(value.field) : "";
    parts.push((fieldLabel ? fieldLabel + ": " : "") + value.message);
  }
  if (Array.isArray(value.messages)) {
    parts.push(...value.messages.filter((message): message is string => typeof message === "string"));
  }
  if (Array.isArray(value.missing_required) && value.missing_required.length) {
    parts.push("Mata kuliah wajib: " + value.missing_required.join(", "));
  }
  if (Array.isArray(value.errors)) {
    parts.push(...value.errors.filter((message): message is string => typeof message === "string"));
  }

  return parts.join(". ") || "Periksa kembali data yang dimasukkan.";
}

export function formatApiDetails(details: unknown[]): string[] {
  return details.map(formatApiDetail);
}

function parseContentDispositionFilename(header: string | null): string | null {
  if (!header) {
    return null;
  }

  const utf8Match = /filename\*\s*=\s*UTF-8''([^;]+)/i.exec(header);
  if (utf8Match?.[1]) {
    try {
      const decoded = decodeURIComponent(utf8Match[1].trim().replace(/^["']|["']$/g, ""));
      return decoded.split(/[/\\]/).pop() || null;
    } catch {
      return null;
    }
  }

  const plainMatch = /filename\s*=\s*"?([^";]+)"?/i.exec(header);
  if (plainMatch?.[1]) {
    return plainMatch[1].trim().split(/[/\\]/).pop() || null;
  }

  return null;
}

export async function api<T = unknown>(
  path: string,
  init: RequestInit = {},
  retry = true
): Promise<Envelope<T>> {
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
  } catch {
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

    notifyUnauthorized(path, response.status);
    throw new ApiError(
      typeof error.message === "string" ? error.message : "Permintaan gagal.",
      response.status,
      Array.isArray(error.details) ? error.details : []
    );
  }

  return value as Envelope<T>;
}

export async function downloadFile(path: string, fallbackFilename = "unduhan"): Promise<void> {
  let response: Response;
  try {
    response = await fetch("/api/v1" + path, {
      credentials: "same-origin",
      cache: "no-store",
    });
  } catch {
    throw new ApiError("Layanan belum dapat dihubungi. Periksa koneksi dan coba lagi.", 0);
  }

  if (!response.ok) {
    const value: unknown = await response.json().catch(() => ({
      error: { message: "Respons layanan tidak valid." },
    }));
    const error = isRecord(value) && isRecord(value.error) ? value.error : {};

    notifyUnauthorized(path, response.status);
    throw new ApiError(
      typeof error.message === "string" ? error.message : "Unduhan gagal.",
      response.status,
      Array.isArray(error.details) ? error.details : []
    );
  }

  const blob = await response.blob();
  const filename = parseContentDispositionFilename(response.headers.get("Content-Disposition")) || fallbackFilename;
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
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

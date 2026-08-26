import { auth } from "../lib/firebase";

const DEFAULT_TIMEOUT_MS = 15_000;

function resolveUrl(input: RequestInfo | URL): RequestInfo | URL {
  if (typeof input !== "string" || /^https?:\/\//i.test(input)) return input;
  const baseUrl = import.meta.env.VITE_API_URL?.replace(/\/$/, "");
  return baseUrl ? `${baseUrl}${input.startsWith("/") ? input : `/${input}`}` : input;
}

export async function apiFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<Response> {
  const headers = new Headers(init.headers || {});
  const currentUser = auth.currentUser;

  if (currentUser && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${await currentUser.getIdToken()}`);
  }
  if (!headers.has("X-Request-ID")) {
    headers.set("X-Request-ID", crypto.randomUUID());
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    DEFAULT_TIMEOUT_MS,
  );
  if (init.signal) {
    init.signal.addEventListener("abort", () => controller.abort(), {
      once: true,
    });
  }

  try {
    return await fetch(resolveUrl(input), {
      ...init,
      headers,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

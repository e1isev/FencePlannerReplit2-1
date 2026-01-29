const resolveApiBase = () => {
  const base = import.meta.env.BASE_URL ?? "/";
  const normalizedBase = base.endsWith("/") ? base : `${base}/`;
  return `${normalizedBase}api`;
};

const API_BASE = resolveApiBase();

const isGithubPagesHost = () => {
  if (typeof window === "undefined") return false;
  return window.location.hostname.endsWith("github.io");
};

export const isApiDisabled = () =>
  import.meta.env.VITE_DISABLE_API === "true" || isGithubPagesHost();

const normalizeApiPath = (path: string) => {
  const trimmed = path.replace(/^\/+/, "");
  if (trimmed.startsWith("api/")) {
    return trimmed.slice(4);
  }
  return trimmed;
};

export const apiUrl = (path: string) => {
  const normalizedPath = normalizeApiPath(path);
  if (!normalizedPath) {
    return API_BASE;
  }
  return `${API_BASE}/${normalizedPath}`;
};

export const apiFetch = (path: string, init?: RequestInit) =>
  fetch(apiUrl(path), init);

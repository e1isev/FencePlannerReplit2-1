const normalizeApiBase = (base: string) => base.replace(/\/+$/, "");

const resolveApiBase = () => {
  const envBase = import.meta.env.VITE_API_BASE_URL;
  if (envBase) {
    return normalizeApiBase(envBase);
  }

  const base = import.meta.env.BASE_URL ?? "/";
  const normalizedBase = base.endsWith("/") ? base : `${base}/`;
  return `${normalizedBase}api`;
};

export const API_BASE = resolveApiBase();

export const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === "true";

const isGithubPagesHost = () => {
  if (typeof window === "undefined") return false;
  return window.location.hostname.endsWith("github.io");
};

export const isApiDisabled = () =>
  DEMO_MODE ||
  import.meta.env.VITE_DISABLE_API === "true" ||
  (isGithubPagesHost() && !import.meta.env.VITE_API_BASE_URL);

const normalizeApiPath = (path: string) => {
  const trimmed = path.replace(/^\/+/, "");
  return trimmed;
};

export const apiUrl = (path: string) => {
  const trimmedPath = normalizeApiPath(path);
  if (!trimmedPath) {
    return API_BASE || path;
  }
  if (!API_BASE) {
    return `/${trimmedPath}`;
  }

  const baseHasApiSuffix = API_BASE.endsWith("/api");
  if (baseHasApiSuffix && trimmedPath.startsWith("api/")) {
    return `${API_BASE}/${trimmedPath.slice(4)}`;
  }
  if (!baseHasApiSuffix && !trimmedPath.startsWith("api/")) {
    return `${API_BASE}/api/${trimmedPath}`;
  }
  return `${API_BASE}/${trimmedPath}`;
};

export const apiFetch = (path: string, init?: RequestInit) =>
  fetch(apiUrl(path), init);

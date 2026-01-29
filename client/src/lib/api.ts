const normalizeApiBase = (base: string) => {
  const trimmed = base.replace(/\/+$/, "");
  if (!trimmed) return "";
  if (trimmed.endsWith("/api")) return trimmed;
  return `${trimmed}/api`;
};

const resolveApiBase = () => {
  const envBase = import.meta.env.VITE_API_BASE_URL;
  if (envBase) {
    return normalizeApiBase(envBase);
  }

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
  import.meta.env.VITE_DISABLE_API === "true" ||
  (isGithubPagesHost() && !import.meta.env.VITE_API_BASE_URL);

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

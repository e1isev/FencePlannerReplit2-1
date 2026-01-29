const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");

export const apiUrl = (path: string) =>
  API_BASE ? `${API_BASE}${path.startsWith("/") ? "" : "/"}${path}` : path;

export { API_BASE };

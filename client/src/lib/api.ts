import { API_BASE, apiUrl } from "@/config/api";

export const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === "true";

const isGithubPagesHost = () => {
  if (typeof window === "undefined") return false;
  return window.location.hostname.endsWith("github.io");
};

export const isApiDisabled = () =>
  DEMO_MODE ||
  import.meta.env.VITE_DISABLE_API === "true" ||
  (isGithubPagesHost() && !API_BASE);

export const apiFetch = (path: string, init?: RequestInit) =>
  fetch(apiUrl(path), init);

export { API_BASE, apiUrl };

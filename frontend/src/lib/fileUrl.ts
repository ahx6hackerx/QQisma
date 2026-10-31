// Uploaded files (avatars, receipts, documents) are served by the API server.
// In production the API lives on a different domain than the frontend
// (VITE_API_URL = https://<backend>/api), so a stored path like
// "/uploads/123.jpg" must be prefixed with the API's origin — otherwise the
// browser asks the *frontend* server for it and the image comes up blank.
const apiBase: string = import.meta.env.VITE_API_URL ?? "/api";
const apiOrigin = apiBase.replace(/\/api\/?$/, "");

export function fileUrl(path?: string | null): string {
  if (!path) return "";
  if (/^(https?:|blob:|data:)/i.test(path)) return path;
  return `${apiOrigin}${path.startsWith("/") ? "" : "/"}${path}`;
}

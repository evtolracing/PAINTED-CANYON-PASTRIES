/**
 * Resolve an image path to a full URL.
 * - Supabase Storage URLs (https://...) are returned as-is.
 * - Relative paths (/uploads/...) are prefixed with the API host (local dev only).
 */
const API_HOST = import.meta.env.VITE_API_HOST || '';

export function getImageUrl(path) {
  if (!path) return undefined;
  if (path.startsWith('http')) return path;
  return `${API_HOST}${path}`;
}

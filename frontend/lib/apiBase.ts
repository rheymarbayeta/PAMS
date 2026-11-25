/**
 * Resolve the backend base URL for browser requests.
 *
 * NEXT_PUBLIC_API_URL is baked in at build time and points at the LAN backend
 * (e.g. http://192.168.11.17:5040). That only works when the app itself is
 * opened from the same LAN host. When the app is opened through another
 * hostname — such as the Cloudflare tunnel at https://pams.dalaguete.online —
 * the LAN address is unreachable (and would be blocked as mixed content), so
 * we use the page's own origin instead. The tunnel routes /api/* and
 * /socket.io/* on that origin to the backend.
 */
const configured = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export function getApiBaseUrl(): string {
  if (typeof window === 'undefined') return configured;
  try {
    if (new URL(configured).hostname === window.location.hostname) return configured;
  } catch {
    return configured;
  }
  return window.location.origin;
}

/**
 * CLIENT_ORIGIN may be a single origin or a comma-separated allow-list
 * (localhost + LAN IP, apex + www, etc). Anything building a user-facing URL
 * wants one canonical origin, not the raw list — interpolating the list yields
 * links like "https://a.com,https://b.com/register".
 */
export function primaryOrigin(clientOrigin: string | undefined): string {
  return (clientOrigin?.split(',')[0] || '').trim() || 'http://localhost:5173';
}

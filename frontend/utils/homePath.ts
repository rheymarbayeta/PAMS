type RoleUser = {
  roles?: string[];
  role_name?: string;
} | null;

/** Default landing path after login / unauthorized fallback. */
export function getHomePath(_user?: RoleUser): string {
  return '/dashboard';
}

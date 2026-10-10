/**
 * Role-aware visibility helpers. These are the glue between the auth-service token
 * roles/permissions and what a project's UI shows.
 */

/** True when `rolesAllowed` is empty/undefined, or the user holds one of them. */
export function isVisibleForRoles(rolesAllowed: string[] | undefined, userRoles: string[]): boolean {
  if (!rolesAllowed || rolesAllowed.length === 0) return true;
  return rolesAllowed.some((role) => userRoles.includes(role));
}

/**
 * Recursively filters a navigation tree to items the user may see. A group with no
 * visible children is itself dropped.
 */
export function filterNavByRoles<T extends { requiredRoles?: string[]; children?: T[] }>(
  items: T[],
  userRoles: string[]
): T[] {
  const result: T[] = [];
  for (const item of items) {
    if (!isVisibleForRoles(item.requiredRoles, userRoles)) continue;
    const children = item.children ? filterNavByRoles(item.children, userRoles) : undefined;
    if (item.children && item.children.length > 0 && (!children || children.length === 0)) continue;
    result.push(children ? { ...item, children } : { ...item });
  }
  return result;
}

import React, { createContext, useContext } from 'react';

export interface SduiWebConfig {
  /** Project key (matches auth-service project code), e.g. DUKAANDAAR. */
  projectKey: string;
  /** Base URL prepended to logical endpoints. */
  apiBase?: string;
  /** The host-injected network function. The only place I/O can happen. */
  fetcher: (path: string, init?: RequestInit) => Promise<unknown>;
  /** Current user's project roles/permissions (from the token claims). */
  userRoles?: string[];
  userPermissions?: string[];
}

interface SduiWebContextValue extends SduiWebConfig {
  hasRole: (role: string) => boolean;
  hasPermission: (permission: string) => boolean;
}

const SduiWebContext = createContext<SduiWebContextValue | null>(null);

export function SduiWebProvider({
  config,
  children,
}: {
  config: SduiWebConfig;
  children: React.ReactNode;
}) {
  const roles = config.userRoles ?? [];
  const permissions = config.userPermissions ?? [];
  const value: SduiWebContextValue = {
    ...config,
    userRoles: roles,
    userPermissions: permissions,
    hasRole: (role) => roles.includes(role),
    hasPermission: (permission) => permissions.includes(permission),
  };
  return <SduiWebContext.Provider value={value}>{children}</SduiWebContext.Provider>;
}

export function useSdui(): SduiWebContextValue {
  const ctx = useContext(SduiWebContext);
  if (!ctx) throw new Error('useSdui must be used within a <SduiWebProvider>');
  return ctx;
}

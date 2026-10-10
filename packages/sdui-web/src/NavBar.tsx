import React from 'react';
import type { NavigationItem } from '@dukaandaar/sdui-core';
import { filterNavByRoles } from '@dukaandaar/sdui-core';
import { useSdui } from './SduiWebProvider';

export interface NavBarProps {
  items: import('@dukaandaar/sdui-core').NavigationItem[];
  onNavigate?: (item: { route: string }) => void;
  activeRoute?: string;
  title?: string;
}

/** Renders a navigation tree filtered by the current user's project roles. */
export function NavBar({ items, onNavigate, activeRoute, title }: NavBarProps) {
  const { hasRole, userRoles = [] } = useSdui();
  const _hasRole = hasRole; // kept for callers that pass a custom resolver
  const visible = userRoles.length > 0 ? filterNavByRoles(items, userRoles) : items;

  const render = (nodes: typeof visible): React.ReactNode =>
    nodes.map((node) => (
      <li key={node.id} style={{ listStyle: 'none' }}>
        <button
          type="button"
          onClick={() => node.route && onNavigate?.({ route: node.route })}
          aria-current={node.route === activeRoute ? 'page' : undefined}
        >
          {node.icon ? `${node.icon} ` : ''}
          {node.label}
        </button>
        {node.children && node.children.length > 0 && (
          <ul style={{ marginLeft: 12 }}>{render(node.children)}</ul>
        )}
      </li>
    ));

  return (
    <nav className="sdui-nav">
      {title && <strong>{title}</strong>}
      <ul>{render(visible as typeof visible)}</ul>
    </nav>
  );
}

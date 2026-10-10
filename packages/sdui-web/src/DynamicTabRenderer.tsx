import React from 'react';

export interface SduiTab {
  key: string;
  label: string;
  requiredRoles?: string[];
}

export interface DynamicTabRendererProps {
  tabs: SduiTab[];
  activeKey?: string;
  userRoles?: string[];
  onChange?: (key: string) => void;
  children?: (activeKey: string) => React.ReactNode;
}

/** Renders a tab strip; tabs the user's roles cannot see are omitted. */
export function DynamicTabRenderer({
  tabs,
  activeKey,
  userRoles = [],
  onChange,
  children,
}: DynamicTabRendererProps) {
  const visible = tabs.filter(
    (tab) => !tab.requiredRoles || tab.requiredRoles.length === 0 || tab.requiredRoles.some((r) => userRoles.includes(r))
  );
  const current = activeKey ?? visible[0]?.key;

  return (
    <div className="sdui-tabs">
      <div role="tablist" style={{ display: 'flex', gap: 8 }}>
        {visible.map((tab) => (
          <button
            key={tab.key}
            role="tab"
            aria-selected={tab.key === current}
            onClick={() => onChange?.(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="sdui-tab-panel">{current ? children?.(current) : null}</div>
    </div>
  );
}

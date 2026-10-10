import React, { Suspense } from 'react';

export type ComponentRegistry = Record<string, React.ComponentType<Record<string, unknown>>>;

/**
 * Resolves a FULL_FRONTEND_IMPLEMENTATION archetype (canvas editors, live tracking)
 * against an explicit host registry.
 */
export function DynamicComponentLoader({
  registry,
  config,
}: {
  registry: ComponentRegistry;
  config: { componentKey: string; props?: Record<string, unknown> };
}) {
  const Component = registry[config.componentKey];
  if (!Component) {
    return <div role="alert">Unknown component: {config.componentKey}</div>;
  }
  return (
    <Suspense fallback={<div>Loading…</div>}>
      <Component {...(config.props ?? {})} />
    </Suspense>
  );
}

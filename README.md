# platform-sdui-core

Option C layered monorepo for the Dukaandaar platform SDUI commons.

- **`@dukaandaar/sdui-core`** — pure TypeScript contracts, tree/reorder algorithms, headless hooks. Zero UI, zero network.
- **`@dukaandaar/sdui-web`** — React web components. Data-in/callback-out; the only I/O is the host-injected `fetcher`.
- **`@dukaandaar/sdui-mobile`** — React Native / Expo components. Same zero-network rule.
- **`sdui-spring-boot-starter`** — Java 17 contracts, `DataTableBuilder`, hierarchy/reorder engines, archetypes.

## Core mandate: zero embedded networking

Packages never import an HTTP client. Endpoints are named by contracts but always resolved and
executed by the host application (`rn-backend`, `rn-frontend`, `rn-mobile`, `sca-job-agent`, …).

## Layout

```
platform-sdui-core/
├── packages/
│   ├── sdui-core/                # @dukaandaar/sdui-core
│   ├── sdui-web/                 # @dukaandaar/sdui-web
│   ├── sdui-mobile/              # @dukaandaar/sdui-mobile
│   └── sdui-spring-boot-starter/ # Maven (NOT a pnpm workspace member)
├── .github/workflows/            # release-npm.yml, release-maven.yml
└── pnpm-workspace.yaml
```

## Build

```bash
# JS packages
pnpm install
pnpm -r build
pnpm -r typecheck

# Java starter (independent of pnpm)
mvn -f packages/sdui-spring-boot-starter/pom.xml test
```

`pnpm run build` builds only the three JS packages. The Maven starter is built separately.

See `../docs/commons/` for the full architecture and the migration guide, and
`../docs/PLATFORM_PLAN.md` for how this fits the multi-project platform.

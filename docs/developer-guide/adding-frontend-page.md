# Adding a Frontend Page

The primary frontend is **`apps/web/`** — a Next.js 15 (App Router) application.
It is **presentation-only**: no occupancy/duration/analytics math, no report
generation on the client. Every value comes from the backend
(`/integration`, `/analytics`, `/reports`).

Before building, confirm the data you need already exists as a backend endpoint.
**Do not invent new business logic or mock APIs on the frontend.**

## 1. Add the route + page

Create `app/<route>/page.tsx`. A server component that renders a client view is
the established pattern:

```tsx
// app/example/page.tsx
import { ExampleView } from "@/components/example/ExampleView";

export const metadata = { title: "Example" };

export default function ExamplePage() {
  return <ExampleView />;
}
```

## 2. Register navigation

Add the route to `utils/routes.ts` (`ROUTES` + `NAV_ITEMS`, with a Lucide icon).
`NAV_ITEMS` is the single source of truth for navigation and breadcrumbs.

## 3. Build the data layer

- **Service** — add `services/example.ts` with typed `apiGet<T>` wrappers over the
  transport-only `services/api-client.ts`. No logic in services.
- **Types** — add `types/example.ts` DTOs that **mirror the backend response**
  (projections, not independent business models). Reuse existing DTOs when the
  backend shape already exists.
- **Hook** — add `hooks/useExample.ts` using TanStack Query (`useQuery` /
  `useMutation`) with a centralised query-key factory (`exampleKeys`).

## 4. Build the UI

- Create components under `components/example/` (PascalCase, `use client` where
  interactive).
- Reuse the shared UI kit in `components/ui/` (button, card, badge, dialog,
  skeleton, loading-spinner, empty-state, error-state).
- For charts, use the single `AnalyticsChart` primitive (Recharts).
- Every panel owns its own loading / error / empty states.

## 5. Presentation-only rules (mandatory)

- No domain math in `lib/format.ts` — only presentation formatting.
- No occupancy / ownership / duration computation on the client.
- Join backend payloads (e.g. sessions ↔ slots) only for display, never to derive
  state.
- All lists/filters/pagination that aren't backed by a backend query param are
  client-side.

## 6. Accessibility & responsiveness

- Keyboard-operable controls; `aria-label` / `aria-current` / `role` as needed.
- `role="list"`/`listitem` for lists, `role="img"` + `aria-label` for charts.
- Responsive via Tailwind breakpoints (+ `2xl:1400px` container cap).
- Focus management for dialogs (use the shared `Dialog`).

## 7. Verify

```bash
cd apps/web
npm run typecheck   # tsc --noEmit (strict)
npm run lint        # next lint
npm run build       # next build
```

All three gates must be green. Update [`PROJECT_MEMORY.md` §15](../../PROJECT_MEMORY.md#15-frontend--module-6-phase-a-appsweb)
with a new phase entry when the page ships.

# dashboard/ - Next.js Dashboard

**Purpose:** Next.js (app router) dashboard for managing campaigns, accounts, jobs, and analytics.

## STRUCTURE
```
dashboard/
├── app/                  # Next.js pages (app router)
│   ├── layout.tsx        # Root layout with Sidebar + Header
│   ├── page.tsx          # Home / overview
│   ├── accounts/         # Account management (list + create)
│   ├── campaigns/        # Campaign CRUD + detail view
│   ├── blast-runner/     # Manual blast trigger UI
│   ├── jobs/             # Job queue monitoring
│   ├── leads/            # Lead capture view
│   ├── settings/         # Runtime settings
│   ├── templates/        # Template CRUD
│   └── analytics/        # Dashboard analytics
├── components/
│   ├── layout/           # Header, Sidebar
│   └── ui/               # Reusable UI components (17 components)
├── lib/                  # Shared utilities, API client, types, hooks
├── public/               # Static assets
├── next.config.mjs
├── tailwind.config.ts
└── tsconfig.json
```

## KEY FILES

| Path | Purpose |
|------|---------|
| `app/layout.tsx` | Root layout with Sidebar + Header shell |
| `app/page.tsx` | Home dashboard overview |
| `lib/api.ts` | Typed fetch wrapper for backend API |
| `lib/hooks.ts` | Shared React hooks (useAccounts, useCampaigns, etc.) |
| `lib/types.ts` | Shared TypeScript types for UI |
| `lib/constants.ts` | App-wide constants |
| `components/ui/DataTable.tsx` | Reusable data table with sorting/pagination |
| `components/ui/StatusBadge.tsx` | Status indicator badges |
| `components/ui/PlatformIcon.tsx` | Platform-specific icons |
| `components/ui/Dialog.tsx` | Modal dialog component |
| `components/ui/FormField.tsx` | Form input wrapper |
| `components/ui/sonner.tsx` | Toast notifications (sonner) |
| `components/ui/Toaster.tsx` | Toast provider/container |

## STACK
- Next.js 14+ (app router)
- Tailwind CSS
- shadcn/ui-based component library
- React Server Components where applicable

## NOTES

- API routes under `/api/*` proxy to Express backend at configurable `NEXT_PUBLIC_API_BASE`
- Dashboard runs on separate port (`DASHBOARD_PORT`, default 3001)
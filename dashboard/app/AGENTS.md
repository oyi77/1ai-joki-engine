# dashboard/app/ - Next.js App Router Pages

**Purpose:** Route handlers and page components for the dashboard UI.

## STRUCTURE
```
app/
├── layout.tsx            # Root layout shell
├── page.tsx              # Home / overview
├── globals.css           # Global styles
├── accounts/
│   ├── page.tsx          # Account list
│   └── new/page.tsx      # Create account
├── campaigns/
│   ├── page.tsx          # Campaign list
│   ├── new/page.tsx      # Create campaign
│   └── [id]/page.tsx     # Campaign detail
├── blast-runner/
│   └── page.tsx          # Manual blast trigger
├── jobs/
│   └── page.tsx          # Job queue monitor
├── leads/
│   └── page.tsx          # Lead capture view
├── templates/
│   ├── page.tsx          # Template list
│   └── new/page.tsx      # Create template
├── settings/
│   └── page.tsx          # Runtime settings
└── analytics/
    └── page.tsx          # Dashboard analytics
```

## CONVENTIONS

- Uses Next.js 14+ App Router (server components by default)
- Route segments map 1:1 to URL paths
- Dynamic routes use `[param]` convention (`[id]`)
- `layout.tsx` provides shared Sidebar + Header shell
- Client components in `components/ui/`

## NOTES

- `globals.css` contains Tailwind directives and global resets
- Each page imports from `lib/api.ts` for backend communication
- `analytics/` is a standalone dashboard view
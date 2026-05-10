# dashboard/components/ui - Shared UI Components

**Purpose:** Reusable shadcn/ui-based components used across the Next.js dashboard.

## COMPONENTS

| Component | Purpose |
|-----------|---------|
| `Button.tsx` | Primary/secondary/destructive buttons |
| `Card.tsx` | Card container with header + content |
| `ConfirmDialog.tsx` | Confirmation modal (dangerous actions) |
| `CopyButton.tsx` | Copy-to-clipboard button |
| `DataTable.tsx` | Sortable/paginated data table |
| `Dialog.tsx` | Generic modal dialog |
| `EmptyState.tsx` | Empty state illustration + message |
| `FormField.tsx` | Labeled form input wrapper (text, email, password, select) |
| `LoadingSkeleton.tsx` | Skeleton loading placeholder |
| `PlatformIcon.tsx` | Platform-specific icon (FB, IG, TW, TG, WA, Threads) |
| `Progress.tsx` | Linear/radial progress indicator |
| `Select.tsx` | Styled select dropdown |
| `Skeleton.tsx` | Generic skeleton loader |
| `sonner.tsx` | Toast notification system |
| `StatusBadge.tsx` | Color-coded status badges (active/pending/failed/completed) |
| `Tabs.tsx` | Tabbed navigation |
| `Toaster.tsx` | Toast provider/container |

## CONVENTIONS

- Built on shadcn/ui patterns (radix primitives + Tailwind)
- Components accept `className` for composition
- Use React 18+ server/client component boundaries
- No inline styles — all Tailwind classes

## NOTES

- `DataTable` is the most complex component — handles pagination, sorting, column config
- `PlatformIcon` maps platform names to Lucide/emoji icons
- `sonner.tsx` wraps sonner toast library for consistent notifications
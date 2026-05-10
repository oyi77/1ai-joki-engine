# src/blast - Blast Orchestrator

**Purpose:** Sequential multi-platform blast execution — loads targets, picks actions, runs them via adapters with delays.

## STRUCTURE
```
blast/
├── blast-runner.ts       # Main orchestrator (sequential, single platform per run)
├── action-picker.ts      # Random action selection (70% comment / 30% DM)
├── delay.ts              # Random delay generation (20-40s comment, 35-60s DM)
├── types.ts              # BlastConfig, BlastResult, BlastTarget, etc.
├── finders/              # Platform-specific target finders
│   ├── instagram-finder.ts
│   ├── threads-finder.ts
│   └── twitter-finder.ts
├── actions/              # Platform action wrappers
│   └── instagram-dm.ts
└── test files (alongside)
```

## KEY FILES

| File | Purpose |
|------|---------|
| `blast-runner.ts` | Orchestrator: loads creds → finds targets → loops (max 30 actions) → logs results |
| `action-picker.ts` | Weighted random selection: 70% comment, 30% chat/DM |
| `delay.ts` | Async delay with random jitter per action type |
| `types.ts` | `BlastConfig`, `BlastResult`, `BlastAction`, `BlastPlatform`, etc. |
| `finders/instagram-finder.ts` | Find IG targets from a seed URL |
| `finders/threads-finder.ts` | Find Threads targets |
| `finders/twitter-finder.ts` | Find Twitter targets from a seed URL |
| `actions/instagram-dm.ts` | IG DM sending via adapter |

## RULES (per blast run)

- Only ONE platform per run (single provider mode)
- Sequential execution — no parallel, no multi-thread
- Max 30 actions per run (hard cap)
- On failure: log and skip — do NOT stop
- Random delay between actions: 20-40s (comment), 35-60s (DM)

## NOTES

- See ADR-0007 for blast runner architecture decisions
- `api/blast.ts` route triggers a blast run via the runner
# src/adapters/providers/twitter - Twitter/X Adapter

**Purpose:** Twitter/X posting, replying, commenting, and DM sending via cookie-based auth.

## KEY FILES

| File | Purpose |
|------|---------|
| `twitter.ts` | Main adapter class |
| `twitter-cookie.ts` | Cookie parsing and session management |
| `twitter-cookie.test.ts` | Cookie tests |
| `post.ts` | Create tweets |
| `reply.ts` | Reply to tweets |
| `comment.ts` | Comment on tweets |
| `dm.ts` | Send direct messages |

## CONVENTIONS

- Cookie-based auth (no Bearer token required)
- Each action type (post/reply/comment/DM) in its own file
- `twitter-cookie.ts` handles session validation and refresh

## NOTES

- Uses mobile.twitter.com endpoints for resilience
- Rate limiting per-account via `getRateLimitStatus()`
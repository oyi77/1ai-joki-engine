# Decision 0004: Facebook Pages posting via Graph API v19.0

## Status

**Superseded** by [ADR-0006: Facebook Cookie Auth](ADR-0006-facebook-cookie-auth.md). The project switched from Graph API token-based auth to cookie-based auth for Facebook.

## Context

The repository needs a Facebook blast path that is stable, testable, and aligned with the existing adapter design.

## Decision

Use the Facebook Pages Graph API v19.0 with a Page access token stored in the encrypted account credential payload.

## Reasoning

- It is the official supported path for Pages posting.
- It keeps the blast flow within the existing `IAdapter` contract.
- It is easier to test than browser automation.
- It lets the worker route Facebook jobs the same way it routes other platforms.

## Consequences

- Facebook blast is limited to Pages, not group/forum automation.
- Tokens must be stored and rotated carefully.
- Rate limit and token-expired errors must be handled explicitly.

## Reversal Trigger

If Meta removes the required Pages permission or the Graph API path becomes unavailable for this use case, revisit the adapter strategy.

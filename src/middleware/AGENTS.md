# src/middleware - Express Middleware

**Purpose:** Express middleware modules.

## STATUS

JWT authentication middleware implemented. Applied globally to all `/v1/*` routes.

## STRUCTURE

- `auth.ts` - JWT authentication middleware with token validation
- `index.ts` - Exports middleware for use in server
- `auth.test.ts` - Unit tests with vitest

## IMPLEMENTATION DETAILS

- Health endpoint (`/v1/health`) is whitelisted to skip authentication
- Invalid or missing tokens return 401 with error code
- Decoded user payload attached to `req.user` for downstream handlers

# Plan: Auto Blast Marketing

## Goal

Build a simple and production-ready auto blast flow:

1. Create one marketing post.
2. Publish to selected social channels.
3. Route traffic to WA/Telegram/webshop links.
4. Send auto-reply welcome message on inbound chat.
5. Continue negotiation manually.

## Scope (MVP)

- Outbound platforms:
  - Twitter
  - Threads
  - Instagram
  - Facebook Pages
- Destination links:
  - WhatsApp
  - Telegram
  - Webshop (hosted on Vercel)
- Auto-reply target:
  - WhatsApp and Telegram inbound messages

## Functional Flow

1. Operator creates campaign content and CTA link.
2. System publishes post to selected platforms.
3. Each post contains destination link (WA/Tele/webshop).
4. User clicks link and starts chat or opens webshop.
5. System sends welcome auto-reply for inbound chat.
6. Conversation is handed off to human for manual negotiation.

## Architecture Rules

- Use SOLID principles.
- Keep implementation KISS (no overengineering).
- Reuse existing modules first (jobs, adapters, dashboard, repos).
- Do not add unrelated features.
- Keep Facebook integration focused on Pages posting first (no Ads in MVP).
- Group/forum posting only where account has valid permission.

## Implementation Phases

1. Phase 1: Campaign payload + post blast consistency
   - Standardize payload for post text, CTA link, platform targets, metadata.
   - Reuse existing job/worker flow.

2. Phase 2: Link tracking
   - Add minimal link tracking (campaign_id, platform, click timestamp).
   - Keep tracking simple and auditable.

3. Phase 3: Inbound auto-reply + manual handoff
   - Implement inbound handlers for WA/Telegram.
   - Send deterministic welcome template.
   - Mark lead status as handed off for manual follow-up.

4. Phase 4: Facebook Pages posting
   - Add Facebook Pages adapter path for publishing post content.
   - Keep API/auth flow isolated and simple.

5. Phase 5: Dashboard completion
   - Compose campaign, choose platforms, set destination link, trigger blast.
   - Show post status, click stats, inbound status, handoff state.

## Required Testing

Run and pass all below:

- Integration test
- Smoke test
- Functional test
- E2E test
- Happy path flow test

## Validation Checklist

- Campaign can be created and triggered from UI.
- Post is published on selected social channels.
- Links resolve correctly to WA/Telegram/webshop.
- Auto-reply welcome is sent on inbound WA/Telegram message.
- Manual negotiation handoff is visible in system state.
- Dashboard build and backend tests are green.

## Non-Goals (for now)

- Facebook Ads campaign management
- AI-generated conversation negotiation
- Multi-tenant user roles
- Complex attribution modeling

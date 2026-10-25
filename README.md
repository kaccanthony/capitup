# CapItUp

CapItUp is a private organization workspace for drafting, reviewing, approving, and storing publicity captions.

Phase 01 establishes the local project foundation only. Authentication, business tables, realtime collaboration, AI, Notion, and deployment are intentionally not implemented.

## Requirements

- Node.js 24.x
- npm 12.x
- A Playwright Chromium installation for end-to-end tests
- A Docker-compatible runtime for local Supabase lifecycle verification

## Local setup

```powershell
npm.cmd install
npx.cmd playwright install chromium
```

Copy `.env.example` to an ignored root-level environment file only when a local feature needs configuration. Environment validation treats absent future integration values as optional, but rejects empty or malformed values once supplied. Never put real credentials in `.env.example`.

## Commands

```powershell
npm.cmd run dev
npm.cmd run format:check
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run test
npm.cmd run test:e2e
npm.cmd run build
npm.cmd run supabase -- start
npm.cmd run supabase -- status
npm.cmd run supabase -- stop
```

The Supabase directory is local configuration only and is not linked to a remote project. Do not substitute a hosted Supabase project when Docker is unavailable.

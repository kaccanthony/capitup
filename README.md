# CapItUp

CapItUp is a private organization workspace for drafting, reviewing, approving, and storing publicity captions.

Phase 0 establishes repository tooling only. Authentication, business tables, realtime collaboration, AI, Notion, and deployment are intentionally not implemented.

## Requirements

- Node.js 24.x
- npm 12.x
- A Playwright Chromium installation for end-to-end tests
- A Docker-compatible runtime only when a later phase needs the local Supabase stack

## Local setup

```powershell
npm.cmd install
npx.cmd playwright install chromium
```

Copy `.env.example` to a local ignored environment file only when a later authorized phase needs configuration. Never put real credentials in `.env.example`.

## Commands

```powershell
npm.cmd run dev
npm.cmd run format:check
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run test
npm.cmd run test:e2e
npm.cmd run build
npx.cmd supabase --version
```

The Supabase directory is local configuration only and is not linked to a remote project.

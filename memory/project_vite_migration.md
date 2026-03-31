---
name: Vite migration completed
description: Project was migrated from Next.js (output:export) to Vite + React Router in March 2026
type: project
---

Migrated from Next.js 15 (output: export) to Vite 6 + React Router 7 in March 2026.

**Why:** Next.js `generateStaticParams` kept breaking for dynamic routes on GitHub Pages; the app is a pure SPA with no SSR so Next.js added no value.

**Key facts:**

- Build output dir changed from `./out` to `./dist`
- Env vars renamed: `NEXT_PUBLIC_*` → `VITE_*` (accessed via `import.meta.env.VITE_*`)
- GitHub Actions repo variable must be renamed from `NEXT_PUBLIC_CONVEX_SELF_HOSTED_URL` to `VITE_CONVEX_SELF_HOSTED_URL` in repo Settings → Variables → Actions
- Entry point: `src/main.tsx` + `index.html` at project root
- Routes defined explicitly in `src/App.tsx` (React Router `<Routes>`)
- `"use client"` directives removed from all files (not needed outside Next.js)
- Font loading: `@font-face` in `app/globals.css` pointing to `geist` package woff2 files

**How to apply:** When working on routing, navigation, or build config, use React Router v7 patterns, not Next.js patterns.

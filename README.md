# CatResumeMaker v1.4.5

Offline-first resume builder + **Job OS** — continuous ATS CV (Gemini/NVIDIA) and a human-in-the-loop remote job clerk. No LinkedIn/Indeed scraping, no auto-apply.

## Status (2026-07)

Resume editor works (rebuild base, day-to-day AI sync, A4 PDF). Auth gives each user a private workspace under `data/users/<id>/`. Job OS discovers roles from public feeds (Remotive, RemoteOK, Arbeitnow, Jobicy), scores fit against your resume, queues jobs, packs applications (AI when keys set), and assists paste/fill via bookmarklets — you always submit. Obscura optional for allowlisted ATS fetch. Deploy: one URL (Railway/Docker); see [DEPLOY.md](./DEPLOY.md). Discovery notes: [JOB_DISCOVERY.md](./JOB_DISCOVERY.md).

## Local dev

```bash
npm install
cp .env.example .env   # JWT_SECRET + NVIDIA_API_KEY (or FREELLMAPI / GEMINI)
npm run dev            # http://localhost:3000
```

Without AI keys the UI still loads; packs fall back to templates.

## Job OS

Navbar **Job OS** or `/?jobos=1` (sign-in required).

| You | Agent |
|-----|--------|
| Approve queue / submit forms | Profile-matched search + fit score |
| Review packs & paste fields | Pack + paste-helper fill (empty fields only) |

```bash
npm run job:discover -- react typescript
npm run job:cannon
npm run cv:pdf
```

Bookmarklets (signed in): `/job-capture.js`, `/paste-helper.js` — drag from Job OS.

## Stack

React 19 + Tailwind 4 · Express · Gemini / NVIDIA NIM · bilingual EN/ES · per-user JWT workspaces.

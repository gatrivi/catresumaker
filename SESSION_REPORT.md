# Overnight session report — CatResumeMaker

**Version now:** `1.4.2`  
**Read this when you have free time** — structured so you can skim headers first.

---

## 1. What this app is (30-second mental model)

```
You log work → AI merges into resume → Job OS finds/scores jobs → AI pack → YOU apply manually
```

| Layer | Path | Role |
|-------|------|------|
| Resume UI | `src/App.tsx` | Edit CV, daily logs, print PDF |
| Job OS | `src/job-os/` | Queue, discover, score, tailor, apply helpers |
| API | `server.ts` + `server/routes/authAndJobs.ts` | Auth, resume AI, job pipeline |
| Per-user data | `data/users/<id>/` | Resume, logs, job-cannon workspace |
| CLI | `job-cannon/cli.ts` | Same pipeline from terminal |

**Design rule:** human-in-the-loop. No auto-submit to LinkedIn/Indeed. Ban-safe.

---

## 2. What was built across recent sessions

### v1.1–1.3 — Job OS + auth + AI tailoring
- Full Job OS dashboard (`/?jobos=1`)
- Per-user accounts (`JWT_SECRET`, `data/users/`)
- NVIDIA / FreeLLM / Gemini for AI packs (`job-cannon/ai/`)

### v1.4.0 — Job discovery
- Public feeds: Remotive, RemoteOK
- Human approves before queue
- Bookmarklet `public/job-capture.js`
- Optional Obscura for ATS URLs only

### v1.4.1 — UI + deploy (your last awake request)
- **Stained glass:** `src/assets/bg.jpg` always visible, `app_icon.png` logo
- `AppShell`, `AppLogo`, `glass-surface` / `glass-nav` CSS
- Railway: frontend at `/`, API at `/api/*` (`railway.toml`, `DEPLOY.md`)

### v1.4.2 — Tonight (while you slept)
- **+2 feeds:** Arbeitnow, Jobicy
- **Job finder auto-search** on open + feed status badges
- **CLI:** `npm run job:discover`
- **`DATA_ROOT`** env for Railway persistent volume
- **`public/paste-helper.js`** — copy paste bank on apply pages (you still click Submit)
- Glass on resume builder forms

---

## 3. Your daily workflow (recommended)

### Morning (15 min)
1. `npm run dev` or open deployed URL
2. Job OS → **Buscar trabajos** (auto-loads)
3. Check high-fit rows → **Agregar a cola**
4. **Puntuar + Pack** (runs fit score + generates ApplicationPack)

### Per application (10 min each)
1. Open job URL from queue
2. Use **paste-helper** bookmarklet OR copy from paste bank in Job OS
3. Fill form yourself → submit
4. Mark **Postulado** in queue

### Evening (5 min)
1. Resume tab → log what you did today
2. **Quick AI Sync** to merge into CV

---

## 4. Deploy on Railway (step-by-step)

1. Push repo to GitHub
2. Railway → New Project → Deploy from repo
3. **Variables:**
   - `JWT_SECRET` = long random string
   - `NVIDIA_API_KEY` = your key (optional but recommended)
   - `DATA_ROOT=/data` (if using volume)
4. **Volume:** mount `/data` (keeps user accounts + jobs across redeploys)
5. **Health check:** `/` (NOT `/api/health`)
6. Open public URL → should see **resume UI**, not JSON

Local prod test:
```bash
npm run build && npm run start
# http://localhost:3000 → UI
# http://localhost:3000/api/health → JSON
```

Files: `railway.toml`, `Dockerfile`, `DEPLOY.md`

---

## 5. Job discovery architecture

```
JobFinderPanel (UI)
    → POST /api/job-os/discover/search
        → job-cannon/discovery/discover.ts
            → feeds.ts (Remotive, RemoteOK, Arbeitnow, Jobicy)
            → fitScore.ts (preview 0–10)
    → POST /api/job-os/discover/import (you approved)
        → addJobDirect() → ApplyQueue.json + jobs/<slug>/
```

**Blocked hosts:** LinkedIn, Indeed, Glassdoor (`discovery/policy.ts`)  
**Allowlisted fetch:** Lever, Greenhouse, Ashby, etc. (Obscura optional)

**Bookmarklets** (drag to bar while signed in):
- `job-capture.js` — page → queue
- `paste-helper.js` — apply page → copy paste bank

**Page Agent / Obscura** (future): documented in `JOB_DISCOVERY.md` — supervised only.

---

## 6. Key env vars

| Variable | Required | Purpose |
|----------|----------|---------|
| `JWT_SECRET` | Yes (shared deploy) | Auth tokens |
| `NVIDIA_API_KEY` | For AI packs | GLM via NIM |
| `DATA_ROOT` | Railway w/ volume | Persistent `data/` |
| `OBSCURA_BIN` | Optional | ATS page fetch |
| `PORT` | Auto on Railway | Default 3000 |

Copy from `.env.example`.

---

## 7. File map (when debugging)

| Problem | Look here |
|---------|-----------|
| UI language | `src/utils/lang.ts`, `translations.ts` |
| Job not in queue | `data/users/<id>/job-cannon/ApplyQueue.json` |
| AI offline | `job-cannon/ai/llmClient.ts`, `/api/health` |
| Feed empty | `job-cannon/discovery/feeds.ts` |
| Deploy shows JSON | `server.ts` `startServer()`, health check path |
| Glass/bg missing | `AppShell.tsx`, `src/assets/bg.jpg` |

---

## 8. CLI cheatsheet

```bash
npm run job:discover -- react typescript    # list matches
npm run job:discover -- --import            # import to queue
npm run job:cannon                          # score + pack all
npm run job:list
```

---

## 9. What’s NOT done yet (honest backlog)

| Item | Why skipped / risk |
|------|-------------------|
| Page Agent wired in-app | Needs your API key + extension; use bookmarklets first |
| LinkedIn job search | Ban risk |
| Auto-apply | By design |
| Email alerts for new jobs | Needs cron + notification channel |
| Mobile polish | Desktop-first |
| Tests | Time/token budget |

**Highest ROI next:** Railway deploy + volume + run one real apply cycle end-to-end.

---

## 10. Version history (quick)

| Ver | Highlights |
|-----|------------|
| 1.1 | Job OS workflow UI |
| 1.2 | AI tailoring (NVIDIA GLM) |
| 1.3 | Multi-user auth |
| 1.4.0 | Job discovery feeds |
| 1.4.1 | Stained glass UI, Railway SPA fix |
| 1.4.2 | +Arbeitnow/Jobicy, auto-search, paste-helper, DATA_ROOT |

---

## 11. First actions when you wake up

1. `npm run dev` → check bg + logo + glass
2. `/?jobos=1` → confirm jobs load in finder
3. If deploying: follow `DEPLOY.md` § Railway volume
4. Set `NVIDIA_API_KEY` if not already — unlocks **Personalizar con IA**

Good night — the app is in a good state to actually hunt jobs tomorrow.

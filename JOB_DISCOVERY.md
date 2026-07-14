# Job discovery (v1.4.5)

Human-in-the-loop only — **no auto-apply**, **no LinkedIn/Indeed automation**.

## Division of labor

| Agent does | You do |
|------------|--------|
| Profile-matched search + fit score | Approve which jobs to queue |
| Pack + AI tailor (when API key set) | Review pack |
| Paste helper: fill empty fields / copy | Review highlighted fields |
| Mark applied in Job OS | **Submit the application form** |

## Apply assist (Paste helper)

1. Job OS → drag **Paste helper** to bookmarks (while signed in — embeds token).
2. **Prepare & open** on Next to apply → packs (AI if available) → opens form.
3. On the form page → click Paste helper bookmarklet:
   - **Fill matching fields** — empty inputs only, green outline
   - Per-field **copy** buttons
   - **Mark applied** after you submit
4. You always click Submit yourself.

Re-drag bookmarklets after login/logout (token is baked into the bookmark).

## Profile-matched search (default)

Job OS reads **your resume** (`resume.json` / `resume.md`) + candidate profile:

- **Keywords** — title, skills, projects → feed search terms
- **Fit score** — base rules + your skill overlap + location (LATAM/remote)
- **Filter** — only jobs with ≥1 profile skill match, min fit **5/10**

Toggle **Match my profile** off for raw keyword search only. Keep your resume updated in the main editor for best results.

API: `GET /api/job-os/discover/profile` · `POST /api/job-os/discover/search` with `{ matchProfile: true, minFit: 5 }`

## Fastest path to apply

1. **Find jobs** → check roles → **Import & pack**.
2. **Prepare & open** → agent packs → form opens.
3. **Paste helper** → Fill matching fields → you submit → Mark applied.

## Built-in feeds (Job OS → Buscar trabajos)

| Feed | API |
|------|-----|
| Remotive | remotive.com/api |
| RemoteOK | remoteok.com/api |
| Arbeitnow | arbeitnow.com/api |
| Jobicy | jobicy.com/api/v2 |

Auto-searches on open. Check results → **Agregar a cola** → **Puntuar + Pack**.

CLI: `npm run job:discover -- react typescript` or `npm run job:discover -- --import`

## Bookmarklets (manual browse)

| Script | Use |
|--------|-----|
| `/job-capture.js` | Capture job page → queue |
| `/paste-helper.js` | On apply page → copy paste bank (you submit) |

Drag to bookmarks bar from Job OS while signed in.

## Obscura (ATS fetch)

[Obscura](https://github.com/h4ckf0r0day/obscura) — headless browser for allowlisted ATS pages only.

```bash
# Windows (downloads binary to bin/obscura/)
npm run obscura:install
# Add printed OBSCURA_BIN path to .env

# Docker sidecar (CDP on :9222)
docker compose -f docker-compose.obscura.yml up -d
```

```env
OBSCURA_BIN=obscura          # or full path from install script
OBSCURA_STEALTH=1
OBSCURA_DUMP=markdown        # text | markdown (default markdown)
OBSCURA_MIN_INTERVAL_MS=4000
```

Job OS shows **Obscura ready** when the binary responds. Paste ATS URL → **Fetch & pack**.

CLI: `npm run job:discover -- react --import` then `npm run job:cannon`

## Page Agent (optional apply assist — you supervise)

In-browser agent for forms **you** already opened. Does not replace bookmarklet for discovery.

1. Chrome extension or npm `page-agent` on pages you're applying to.
2. You review every action before submit.
3. Repo: https://github.com/alibaba/page-agent

## Policy

| Allowed | Blocked |
|---------|---------|
| Public job APIs | LinkedIn scraping |
| ATS pages you paste | Indeed/Glassdoor bots |
| Bookmarklet on your tab | Auto-submit applications |

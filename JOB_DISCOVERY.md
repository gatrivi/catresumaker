# Job discovery (v1.4.3)

Human-in-the-loop only — **no auto-apply**, **no LinkedIn/Indeed automation**.

## Fastest path to apply

1. **Job OS → Find jobs** → check roles → **Import & pack** (one click).
2. Or paste a Lever/Greenhouse URL → **Fetch & pack** (Obscura).
3. **Next to apply** banner → Open form → drag **Paste helper** bookmarklet → copy fields → **Mark applied**.

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

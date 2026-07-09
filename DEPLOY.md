# Deploy (Railway / Render / Docker)

One process serves **the React app at `/`** and **API at `/api/*`**.

## Railway (recommended)

1. New project → Deploy from GitHub repo
2. Railway reads `railway.toml` automatically
3. Set env vars: `JWT_SECRET`, `NVIDIA_API_KEY` (or other LLM keys)
4. Open the service URL → you should see the **resume UI**, not JSON

Health check: `/` (HTML). API health: `/api/health` (JSON).

## Local production test

```bash
npm run build
npm run start
# http://localhost:3000 → frontend
# http://localhost:3000/api/health → API
```

## Docker

```bash
docker build -t catresumaker .
docker run -p 3000:3000 -e JWT_SECRET=change-me catresumaker
```

## Notes

- `NODE_ENV=production` is set in `railway.toml`; server also auto-detects `dist/index.html`
- Do **not** point Railway public domain only at `/api/health` — use `/` for the app
- Persistent user data: mount a volume on `data/` if you need accounts to survive redeploys

### Railway volume (keep accounts after redeploy)

1. Railway → your service → **Volumes** → Add volume, mount path `/data`
2. Variables → `DATA_ROOT=/data`
3. Redeploy

Without this, `data/users/` resets on each deploy.

# Deployment Plan: Mac Mini + Cloudflare Tunnel + GitHub Actions

## Overview

Self-host the app on a Mac Mini, exposed publicly via a Cloudflare Tunnel (no open ports needed),
with automatic deploys triggered by pushing to `main` on GitHub.

```
Browser → liarsdice.thepregames.com → Cloudflare → cloudflared → Mac Mini (localhost:3000)
Browser WebSocket/API → liarsdice-api.thepregames.com → Cloudflare → cloudflared → Mac Mini (localhost:3001)
Push to GitHub → GitHub Actions runner on Mac Mini → npm ci → npm run build → restart local app services
```

## Current Production Hostnames

- Frontend: `https://liarsdice.thepregames.com`
- WebSocket/API: `https://liarsdice-api.thepregames.com`

Why the API uses `liarsdice-api` instead of `liarsdice.api`:

- Cloudflare Universal SSL covers the apex domain and first-level subdomains
- `liarsdice.thepregames.com` is covered
- `liarsdice.api.thepregames.com` is a deeper subdomain and may require additional certificate setup
- `liarsdice-api.thepregames.com` avoids that issue and works with the current setup

## Domain Migration Checklist

If you are moving the app from an old domain to a new one, update all four places below:

1. `client/.env.production`
   Set `VITE_SOCKET_URL=https://liarsdice-api.yourdomain.com`
2. `server` CORS config
   Add the frontend and API origins, or set `ALLOWED_ORIGINS`
3. `~/.cloudflared/config.yml`
   Point the ingress hostnames at the new frontend and API subdomains
4. `~/Library/LaunchAgents`
   Reinstall the checked-in plist files if their filenames or labels changed

The current repo includes `scripts/manage_services.sh install` to copy the repo's
plist files into `~/Library/LaunchAgents`.

Important: `~/.cloudflared/config.yml` is machine-local config on the Mac Mini.
It is not read by GitHub Actions and should not be treated as repo config that needs
to be pushed to GitHub.

---

## Step 1: Set Up the Mac Mini

### 1.1 Install Homebrew
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

### 1.2 Install Node.js
```bash
brew install node
```

### 1.3 Install runtime dependencies
```bash
brew install cloudflare/cloudflare/cloudflared
```

### 1.4 Clone the repo
```bash
git clone https://github.com/ThurstonL/Liar-s-Dice.git
cd Liar-s-Dice
npm install
```

### 1.5 Build the app
```bash
npm run build
```

---

## Step 1A: Install the repo's LaunchAgents

The repo's current deployment path uses macOS `launchd` for:

- frontend static file server on port `3000`
- backend Node server on port `3001`
- `cloudflared tunnel run`

Install the checked-in plist files:

```bash
./scripts/manage_services.sh install
launchctl bootstrap "gui/$(id -u)" "$HOME/Library/LaunchAgents/com.thepregames.liarsdice.backend.plist"
launchctl bootstrap "gui/$(id -u)" "$HOME/Library/LaunchAgents/com.thepregames.liarsdice.frontend.plist"
launchctl bootstrap "gui/$(id -u)" "$HOME/Library/LaunchAgents/com.thepregames.liarsdice.tunnel.plist"
./scripts/manage_services.sh restart
```

If you are migrating from the old `com.mitoful.*` labels, unload those first:

```bash
launchctl bootout "gui/$(id -u)" "$HOME/Library/LaunchAgents/com.mitoful.liarsdice.backend.plist" 2>/dev/null || true
launchctl bootout "gui/$(id -u)" "$HOME/Library/LaunchAgents/com.mitoful.liarsdice.frontend.plist" 2>/dev/null || true
launchctl bootout "gui/$(id -u)" "$HOME/Library/LaunchAgents/com.mitoful.liarsdice.tunnel.plist" 2>/dev/null || true
```

PM2 can still be used as a fallback, but it is no longer the primary runtime path reflected in this repo.

---

## Step 2: Set Up the Client (Static Files)

Build the client and serve it from the Express server or a static file host.

### Option A: Serve client from Express (simplest)
Add the following to `server/src/index.ts` (after building the client):

```ts
import path from 'path';

// Serve static client files in production
app.use(express.static(path.join(__dirname, '../../client/dist')));
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, '../../client/dist/index.html'));
});
```

Then rebuild:
```bash
npm run build
./scripts/manage_services.sh restart
```

### Option B: Deploy client to a free static host (e.g. Cloudflare Pages)
1. Go to [pages.cloudflare.com](https://pages.cloudflare.com) → New project → Connect GitHub
2. Build command: `npm run build --workspace=client`
3. Output directory: `client/dist`
4. Set env var: `VITE_SOCKET_URL=https://liarsdice-api.yourdomain.com`

---

## Step 3: Update CORS for Production

In `server/src/index.ts`, either set `ALLOWED_ORIGINS` or update the CORS allowlist to allow your production domain:

```ts
const corsOptions = {
  origin: (origin, callback) => {
    const allowed = [
      'http://localhost:5173',
      'https://liarsdice.yourdomain.com', // frontend
      'https://liarsdice-api.yourdomain.com', // API host
    ];
    if (!origin || allowed.includes(origin)) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
};
```

Update the client's socket connection URL (e.g. in `client/src/hooks/useSocket.ts`):
```ts
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';
```

And add to `client/.env.production`:
```
VITE_SOCKET_URL=https://liarsdice-api.yourdomain.com
```

---

## Step 4: Set Up Cloudflare Tunnel

### 4.1 Get a domain on Cloudflare
Buy or transfer a domain at [cloudflare.com](https://cloudflare.com). (~$10/yr)

### 4.2 Authenticate and create a tunnel
```bash
cloudflared tunnel login
cloudflared tunnel create liars-dice
```

If you already have a managed tunnel in Cloudflare, you can reuse it instead of creating a new one.

### 4.3 Configure the tunnel
Create `~/.cloudflared/config.yml`:
```yaml
tunnel: <YOUR_TUNNEL_ID>
credentials-file: /Users/<your-username>/.cloudflared/<YOUR_TUNNEL_ID>.json

ingress:
  - hostname: liarsdice.yourdomain.com
    service: http://localhost:3000
  - hostname: liarsdice-api.yourdomain.com
    service: http://localhost:3001
  - service: http_status:404
```

If your old config still points at the previous domain, update both hostnames before restarting `cloudflared`.

### 4.4 Add DNS route
```bash
cloudflared tunnel route dns liars-dice liarsdice.yourdomain.com
cloudflared tunnel route dns liars-dice liarsdice-api.yourdomain.com
```

If `cloudflared tunnel route dns` is unavailable because the local machine does not have a working
`cert.pem` for the correct zone, add the DNS records manually in Cloudflare:

- `liarsdice` -> `<TUNNEL_UUID>.cfargotunnel.com` as a proxied `CNAME`
- `liarsdice-api` -> `<TUNNEL_UUID>.cfargotunnel.com` as a proxied `CNAME`

The hostname routing still happens in `~/.cloudflared/config.yml`, so both public hostnames can point
to the same tunnel target.

### 4.5 Run the tunnel

If you are using the repo's checked-in launchd setup, restart the tunnel with:
```bash
./scripts/manage_services.sh restart
```

That path uses [scripts/run_tunnel.sh](/Users/thurston/Workspace/Liar-s-Dice/scripts/run_tunnel.sh:1), which runs:

```bash
cloudflared tunnel run
```

You do not need `sudo cloudflared service install` for the current repo-managed setup.

---

## Step 5: Set Up GitHub Actions Auto-Deploy (Self-Hosted Runner)

Instead of SSH-ing from GitHub into your home network, register the Mac Mini as a
**self-hosted GitHub Actions runner**. The runner polls GitHub outbound, so no inbound
ports or SSH secrets are needed.

### 5.1 Register the Mac Mini as a self-hosted runner

1. Go to your repo on GitHub → **Settings → Actions → Runners → New self-hosted runner**
2. Select **macOS** as the OS
3. Follow the exact commands GitHub shows you to download and configure the runner agent
4. When asked for a runner name, use something like `mac-mini`
5. Start the runner:
```bash
./run.sh
```

### 5.2 Install the runner as a persistent service (auto-starts on boot)
```bash
sudo ./svc.sh install
sudo ./svc.sh start
```

### 5.3 The workflow file is already in the repo
`.github/workflows/deploy.yml` uses `runs-on: self-hosted`, so every push to `main`
will automatically trigger a deploy on your Mac Mini. The workflow checks out the repo,
installs dependencies, builds the app, and restarts the local services. If the new
`launchd` plists are installed it uses `./scripts/manage_services.sh restart`;
otherwise it falls back to PM2.

No repo-specific GitHub secrets are required for deployment.

---

## Summary Checklist

- [ ] Clone repo on Mac Mini
- [ ] Install Node and cloudflared
- [ ] Set `VITE_SOCKET_URL` to your production domain
- [ ] Update CORS to allow your production domain
- [ ] Build the app
- [ ] Set up Cloudflare domain and tunnel
- [ ] Copy current plist files into `~/Library/LaunchAgents` if using the repo launchd setup
- [ ] Register the Mac Mini as a self-hosted GitHub runner
- [ ] Push to `main` and verify the deploy workflow succeeds

---

## Notes

- The current repo-managed runtime uses `launchd`, not PM2, as the primary service manager.
- Restart all local app services with `./scripts/manage_services.sh restart`.
- Check local service state with `./scripts/manage_services.sh status`.
- The Cloudflare Tunnel runs through the checked-in `launchd` agent and starts automatically after login.
- WebSockets work natively through Cloudflare Tunnel with no extra config.

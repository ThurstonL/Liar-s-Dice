# Deployment Plan: Mac Mini + Cloudflare Tunnel + GitHub Actions

## Overview

Self-host the app on a Mac Mini, exposed publicly via a Cloudflare Tunnel (no open ports needed),
with automatic deploys triggered by pushing to `main` on GitHub.

```
Browser → liarsdice.yourdomain.com → Cloudflare → cloudflared → Mac Mini (localhost:3001)
Push to GitHub → GitHub Action → SSH into Mac Mini → git pull → PM2 restart
```

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

### 1.3 Install PM2 (process manager — keeps the server running)
```bash
npm install -g pm2
```

### 1.4 Clone the repo
```bash
git clone https://github.com/ThurstonL/Liar-s-Dice.git
cd Liar-s-Dice
npm install
```

### 1.5 Build and start the server with PM2
```bash
npm run build
pm2 start server/dist/index.js --name liars-dice
pm2 save          # Save process list so it survives reboots
pm2 startup       # Follow the printed command to enable auto-start on login
```

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
pm2 restart liars-dice
```

### Option B: Deploy client to a free static host (e.g. Cloudflare Pages)
1. Go to [pages.cloudflare.com](https://pages.cloudflare.com) → New project → Connect GitHub
2. Build command: `npm run build --workspace=client`
3. Output directory: `client/dist`
4. Set env var: `VITE_SERVER_URL=https://liarsdice.yourdomain.com`

---

## Step 3: Update CORS for Production

In `server/src/index.ts`, update the CORS `origin` to allow your production domain:

```ts
const corsOptions = {
  origin: (origin, callback) => {
    const allowed = [
      'http://localhost:5173',
      'https://liarsdice.yourdomain.com', // 👈 replace with your domain
    ];
    if (!origin || allowed.includes(origin)) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
};
```

Update the client's socket connection URL (e.g. in `client/src/hooks/useSocket.ts`):
```ts
const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';
```

And add to `client/.env.production`:
```
VITE_SERVER_URL=https://liarsdice.yourdomain.com
```

---

## Step 4: Set Up Cloudflare Tunnel

### 4.1 Get a domain on Cloudflare
Buy or transfer a domain at [cloudflare.com](https://cloudflare.com). (~$10/yr)

### 4.2 Install cloudflared on Mac Mini
```bash
brew install cloudflare/cloudflare/cloudflared
```

### 4.3 Authenticate and create a tunnel
```bash
cloudflared tunnel login
cloudflared tunnel create liars-dice
```

### 4.4 Configure the tunnel
Create `~/.cloudflared/config.yml`:
```yaml
tunnel: <YOUR_TUNNEL_ID>
credentials-file: /Users/<your-username>/.cloudflared/<YOUR_TUNNEL_ID>.json

ingress:
  - hostname: liarsdice.yourdomain.com
    service: http://localhost:3001
  - service: http_status:404
```

### 4.5 Add DNS route
```bash
cloudflared tunnel route dns liars-dice liarsdice.yourdomain.com
```

### 4.6 Run the tunnel (as a background service)
```bash
sudo cloudflared service install
sudo launchctl start com.cloudflare.cloudflared
```

The tunnel now runs automatically at Mac Mini startup.

---

## Step 5: Set Up GitHub Actions Auto-Deploy

### 5.1 Enable SSH on Mac Mini
System Settings → General → Sharing → Remote Login → Enable

### 5.2 Generate SSH key for GitHub Actions (on any machine)
```bash
ssh-keygen -t ed25519 -C "github-actions" -f ~/.ssh/github_actions
```
Add the **public key** (`github_actions.pub`) to Mac Mini's `~/.ssh/authorized_keys`:
```bash
cat ~/.ssh/github_actions.pub >> ~/.ssh/authorized_keys
```

### 5.3 Add secrets to GitHub
Go to your repo → Settings → Secrets and variables → Actions → New secret:

| Secret Name | Value |
|---|---|
| `MAC_HOST` | Your Mac Mini's local IP (e.g. `192.168.1.50`) or Cloudflare Access hostname |
| `MAC_USER` | Your Mac Mini username |
| `SSH_PRIVATE_KEY` | Contents of `~/.ssh/github_actions` (private key) |
| `DEPLOY_PATH` | Full path to the repo on Mac Mini (e.g. `/Users/yourname/Liar-s-Dice`) |

### 5.4 Create the GitHub Actions workflow
The file `.github/workflows/deploy.yml` is already set up in this repo (see below).

---

## Step 6: Add the Workflow File

Create `.github/workflows/deploy.yml` in the repo:

```yaml
name: Deploy to Mac Mini

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Deploy via SSH
        uses: appleboy/ssh-action@v1.0.3
        with:
          host: ${{ secrets.MAC_HOST }}
          username: ${{ secrets.MAC_USER }}
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            cd ${{ secrets.DEPLOY_PATH }}
            git pull origin main
            npm install
            npm run build
            pm2 restart liars-dice
```

Commit and push this file, and every future push to `main` will auto-deploy.

---

## Summary Checklist

- [ ] Clone repo on Mac Mini
- [ ] Install Node, PM2, cloudflared
- [ ] Build and start server with PM2
- [ ] Update CORS and client socket URL for production domain
- [ ] Set up Cloudflare domain and tunnel
- [ ] Enable SSH on Mac Mini
- [ ] Add SSH key + GitHub secrets
- [ ] Push `.github/workflows/deploy.yml` → auto-deploy active

---

## Notes

- The app only needs to be running when you want to play. Use `pm2 stop liars-dice` to stop it and `pm2 start liars-dice` to start it again.
- The Cloudflare Tunnel runs as a system service and starts automatically on boot — you only need Node/PM2 running for the app itself to work.
- WebSockets work natively through Cloudflare Tunnels with no extra config.

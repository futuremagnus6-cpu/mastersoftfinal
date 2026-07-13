# Hostinger Deployment Guide

Deploy **Future Magnus Business OS** on Hostinger. Two paths:

- [**Option A: Managed Node.js Hosting**](#option-a-managed-nodejs-hosting-recommended) — Easier, hPanel-based, auto SSL. **Recommended.**
- [**Option B: VPS Hosting**](#option-b-vps-hosting) — Full control, manual Nginx/PM2 setup.

---

## Quick Start

| Step | Managed Hosting | VPS Hosting |
|------|-----------------|-------------|
| 1 | Set up Node.js app in hPanel | SSH into server, install Node.js + Nginx |
| 2 | Connect Git repo or upload files | Clone repo to `/var/www/yourdomain/app` |
| 3 | Add env vars in hPanel GUI | Copy `backend/deploy.env.example` → `backend/.env` |
| 4 | Set build command in hPanel | Run `backend/scripts/deploy.sh --vps` |
| 5 | Click Deploy | Done — PM2 auto-starts |

---

## Prerequisites

| Item | Required | How to get it |
|------|----------|---------------|
| **Hostinger plan** (Business/Cloud/VPS) | ✅ | [hostinger.com](https://hostinger.com) |
| **Domain** | ✅ | Hostinger or any registrar |
| **MongoDB Atlas cluster** (free tier works) | ✅ | [mongodb.com/atlas](https://www.mongodb.com/atlas) |
| **Razorpay account** (or disable payments) | ✅ | [razorpay.com](https://razorpay.com) |
| **SMTP service** | ✅ | SendGrid, Mailgun, Brevo, or Hostinger Email |
| **Git repository** | ✅ | Push code to GitHub/GitLab |
| **Node.js 18+** | ✅ | Included in Hostinger plans |
| **Redis** | ⬜ Optional | Upstash (free) or skip if not using queues |

---

## Option A: Managed Node.js Hosting (Recommended)

### Step 1: Create the Node.js App in hPanel

1. Login to **hPanel** → **Hosting** → Select your domain
2. Go to **Advanced** → **Node.js** Setup
3. Click **Create/Setup** and fill in:
   - **Mode:** `Production`
   - **Entry Point:** `backend/server.js`
   - **Application Path:** `/` (root domain)
   - **Node.js Version:** `20.x`

### Step 2: Deploy Your Code

**Via Git (easiest):**
1. hPanel → **Git** → Connect your GitHub/GitLab repository
2. Deploy the `main` branch

**Via File Manager:**
1. Zip the project (excluding `node_modules/`, `.env`, `dist/`)
2. Upload via hPanel → **File Manager** → Extract

### Step 3: Set Environment Variables

In hPanel → **Node.js** → **Environment Variables**, add every variable from `backend/deploy.env.example`:

| Variable | Example Value | Why |
|----------|--------------|-----|
| `NODE_ENV` | `production` | Enables production optimizations |
| `PORT` | `5000` | Internal port (Hostinger maps it) |
| `FRONTEND_URL` | `https://yourdomain.com` | CORS origin |
| `MONGODB_URI` | `mongodb+srv://...` | MongoDB Atlas connection string |
| `JWT_SECRET` | _(64-char hex)_ | Token signing |
| `JWT_REFRESH_SECRET` | _(64-char hex)_ | Refresh token signing |
| `SMTP_HOST/PORT/USER/PASS` | _(SMTP credentials)_ | Email sending |
| `EMAIL_FROM` | `noreply@yourdomain.com` | Sender address |
| `RAZORPAY_KEY_ID` | `rzp_live_...` | Payment gateway |
| `RAZORPAY_KEY_SECRET` | _(secret)_ | Payment gateway |
| `SUPER_ADMIN_EMAIL` | `admin@yourdomain.com` | First admin account |

> ⚠️ **Do NOT upload a `.env` file** — Managed hosting reads from hPanel's interface.

### Step 4: Configure Build Settings

In hPanel → **Node.js**:
- **Build Command:** `cd frontend && npm install && npm run build`
- **Output Directory:** `frontend/dist` (relative path, no leading `/`)
- **Start Command:** `node backend/server.js`

### Step 5: Deploy

Click **Deploy** in hPanel. Hostinger will:
1. Clone your repo
2. Install backend deps (`npm install --production`)
3. Run the build command (installs frontend deps + Vite build)
4. Start the Node.js server
5. Issue free SSL certificate automatically

### Step 6: Seed Super Admin

After the first successful deployment, run once via hPanel:
- **Node.js** → **Run Script** → `cd backend && node scripts/seedSuperAdmin.js`

Or via SSH (if available): `node backend/scripts/seedSuperAdmin.js`

---

## Option B: VPS Hosting (Ubuntu)

### Step 1: Initial Server Setup

```bash
# SSH into your VPS
ssh root@your-server-ip

# Update system & install essentials
apt update && apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs nginx git
npm install -g pm2

# Verify
node -v   # v20.x
npm -v    # 10.x
```

### Step 2: Clone Repository & Configure

```bash
# Create app directory
mkdir -p /var/www/yourdomain
cd /var/www/yourdomain

# Clone your repo
git clone https://github.com/your-org/your-repo.git app
cd app

# Set up environment variables
cp backend/deploy.env.example backend/.env
nano backend/.env   # Fill in all your production values
```

### Step 3: Run Deployment Script

```bash
# Install deps, build frontend, seed DB, start with PM2
bash backend/scripts/deploy.sh --vps

# Check everything is running
pm2 status
pm2 logs magnus-backend --lines 20
```

### Step 4: Configure Nginx

```bash
# Copy the Nginx template and edit for your domain
cp backend/deploy.nginx.conf /etc/nginx/sites-available/yourdomain.com
nano /etc/nginx/sites-available/yourdomain.com
# → Replace all 'yourdomain.com' with your actual domain
# → Replace /var/www/yourdomain with your actual path

# Enable the site
ln -s /etc/nginx/sites-available/yourdomain.com /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test and reload
nginx -t && systemctl reload nginx
```

### Step 5: Enable SSL

```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Verify auto-renewal
certbot renew --dry-run
```

---

## Post-Deployment Checklist

- [ ] **Health check:** `curl https://yourdomain.com/api/health` → JSON response
- [ ] **Frontend loads:** Visit your domain in browser → landing page renders
- [ ] **No console errors:** Open DevTools → Console tab → no 404s or CORS errors
- [ ] **Login works:** Use the super admin email/password you configured
- [ ] **SSL active:** Padlock icon in browser address bar
- [ ] **API works:** Navigate to a few pages — data loads correctly

---

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| `MongoDB connection failed` | Atlas IP whitelist | Add Hostinger server IP in Atlas → Network Access |
| `502 Bad Gateway` | Node.js not running | VPS: `pm2 restart magnus-backend` → Managed: Restart in hPanel |
| Page refresh shows 404 | SPA routing | VPS: Nginx needs `try_files $uri $uri/ /index.html;` (included in template) |
| `sharp` install fails | Native build issue | `npm install --ignore-scripts sharp` or `apt install build-essential` |
| Blank page / CORS error | Frontend URL mismatch | Verify `FRONTEND_URL` matches the actual domain exactly |
| `EADDRINUSE` :::5000 | Port conflict | `lsof -ti :5000 \| xargs kill -9` (VPS) or change PORT in env |
| Login instantly logs out | JWT secret changed | Use the same `JWT_SECRET` across all deploys |

---

## File Reference

| File | Purpose |
|------|---------|
| `backend/deploy.env.example` | Template with all environment variables documented |
| `backend/ecosystem.config.js` | PM2 process manager config (VPS) |
| `backend/deploy.nginx.conf` | Nginx reverse proxy with WebSocket support (VPS) |
| `backend/deploy.htaccess` | Apache fallback config (Shared hosting only) |
| `backend/scripts/deploy.sh` | One-click deploy script (build, seed, start) |
| `frontend/src/config.js` | Frontend runtime config (reads VITE_API_URL) |

---

## Maintenance

### Update the App

```bash
# VPS
cd /var/www/yourdomain/app
git pull origin main
bash backend/scripts/deploy.sh --vps

# Managed: Push to Git repo → hPanel auto-deploys (or click Re-Deploy)
```

### View Logs

| Environment | How |
|-------------|-----|
| **Managed** | hPanel → Node.js → Logs |
| **VPS (PM2)** | `pm2 logs magnus-backend` |
| **File logs** | `cat backend/logs/error.log` |
| **Nginx access** | `tail -f /var/log/nginx/access.log` |

### Backup MongoDB Atlas

Atlas auto-backups (enable in Atlas → Backup). Or manually:
```bash
mongodump --uri="$MONGODB_URI" --out=./backup-$(date +%Y%m%d)
```

#!/bin/bash
# ════════════════════════════════════════════════════════════════
# deploy.sh — Hostinger Deployment Script
# ════════════════════════════════════════════════════════════════
# Usage:
#   bash deploy.sh              # Build only (for Managed hosting)
#   bash deploy.sh --vps        # Build + start with PM2 (VPS)
#
# Assumes the repo is already cloned/pushed to the server.
# ════════════════════════════════════════════════════════════════

set -e

echo "═══════════════════════════════════════"
echo "   Magnus BOS — Deployment Script"
echo "═══════════════════════════════════════"

# ─── Configuration ───
APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BACKEND_DIR="$APP_DIR/backend"
FRONTEND_DIR="$APP_DIR/frontend"

echo "📁 App directory: $APP_DIR"

# ─── 1. Install Backend Dependencies ───
echo ""
echo "📦 Installing backend dependencies..."
cd "$BACKEND_DIR"
npm install --production 2>&1 || npm install 2>&1

# ─── 2. Create required directories ───
mkdir -p "$BACKEND_DIR/logs"
mkdir -p "$BACKEND_DIR/uploads/products"
mkdir -p "$BACKEND_DIR/uploads/logos"

# ─── 3. Build Frontend ───
echo ""
echo "🏗️  Building frontend..."
cd "$FRONTEND_DIR"
npm install 2>&1
npm run build 2>&1

echo "✅ Frontend built at: $FRONTEND_DIR/dist"

# ─── 4. Seed Super Admin (first run only) ───
SEED_FLAG="$BACKEND_DIR/.seeded"
if [ ! -f "$SEED_FLAG" ]; then
  echo ""
  echo "🌱 Seeding super admin (first run)..."
  cd "$BACKEND_DIR"
  node scripts/seedSuperAdmin.js 2>&1 && touch "$SEED_FLAG" && echo "✅ Seed complete" || echo "⚠️  Seed skipped"
else
  echo ""
  echo "⏭️  Seed already completed (remove $SEED_FLAG to re-run)"
fi

# ─── 5. Start / Restart the App ───
if [ "$1" = "--vps" ]; then
    echo ""
    echo "🚀 Starting with PM2 (VPS mode)..."
    pm2 delete magnus-backend 2>/dev/null || true
    pm2 start "$BACKEND_DIR/ecosystem.config.js" 2>&1
    pm2 save 2>&1
    echo "✅ Deployment complete! App running via PM2."
    echo "   Commands: pm2 logs magnus-backend | pm2 status"
else
    echo ""
    echo "✅ Build complete. For Managed Hosting:"
    echo "   1. The frontend build is at: $FRONTEND_DIR/dist"
    echo "   2. In hPanel > Node.js:"
    echo "        Entry Point:     backend/server.js"
    echo "        Build Command:   cd frontend && npm install && npm run build"
    echo "        Output Directory: frontend/dist"
    echo "   3. Add env vars from backend/deploy.env.example"
    echo "   4. Click 'Deploy'"
fi

echo ""
echo "═══════════════════════════════════════"
echo "   Done!"
echo "═══════════════════════════════════════"

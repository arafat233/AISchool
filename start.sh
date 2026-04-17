#!/usr/bin/env bash
# AISchool — one-command startup
# Usage: ./start.sh [--build]
set -e

BUILD_FLAG=""
if [[ "$1" == "--build" ]]; then
  BUILD_FLAG="--build"
fi

echo ""
echo "🚀  Starting AISchool ERP..."
echo ""

# ── 1. Spin up all containers ──────────────────────────────────────────────
docker compose up $BUILD_FLAG -d

echo ""
echo "⏳  Waiting for services to be healthy..."
sleep 10

# ── 2. Show running containers ─────────────────────────────────────────────
docker compose ps

# ── 3. Tunnel portals via localtunnel ─────────────────────────────────────
# Install localtunnel if not present
if ! command -v lt &> /dev/null; then
  echo "📦  Installing localtunnel..."
  npm install -g localtunnel --silent
fi

echo ""
echo "🌐  Opening tunnels..."

npx lt --port 4000 --subdomain aischool-admin   2>/dev/null &
npx lt --port 4001 --subdomain aischool-teacher 2>/dev/null &
npx lt --port 4002 --subdomain aischool-student 2>/dev/null &
npx lt --port 4003 --subdomain aischool-parent  2>/dev/null &

sleep 3

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  ✅  AISchool ERP is running!"
echo ""
echo "  PORTALS"
echo "  Admin   → https://aischool-admin.loca.lt"
echo "  Teacher → https://aischool-teacher.loca.lt"
echo "  Student → https://aischool-student.loca.lt"
echo "  Parent  → https://aischool-parent.loca.lt"
echo ""
echo "  BACKEND APIs (localhost only)"
echo "  Auth        → http://localhost:3001"
echo "  User        → http://localhost:3002"
echo "  Student     → http://localhost:3003"
echo "  Academic    → http://localhost:3004"
echo "  Attendance  → http://localhost:3005"
echo "  Fees        → http://localhost:3006"
echo "  Notify      → http://localhost:3007"
echo "  Exam        → http://localhost:3008"
echo "  LMS         → http://localhost:3009"
echo "  HR          → http://localhost:3010"
echo "  Payroll     → http://localhost:3011"
echo "  Certificate → http://localhost:3012"
echo "  Admission   → http://localhost:3013"
echo "  Transport   → http://localhost:3014"
echo "  Health      → http://localhost:3015"
echo ""
echo "  INFRA"
echo "  Postgres  → localhost:5432"
echo "  Redis     → localhost:6379"
echo "  MQTT      → localhost:1883"
echo "  InfluxDB  → localhost:8086"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "  To stop:  docker compose down"
echo "  Logs:     docker compose logs -f <service>"
echo ""

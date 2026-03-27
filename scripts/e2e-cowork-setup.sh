#!/usr/bin/env bash
# =============================================================================
# e2e-cowork-setup.sh — Prepare the Linux dev machine for Cowork E2E testing
#
# Usage:
#   ./scripts/e2e-cowork-setup.sh          # Start mode (default)
#   ./scripts/e2e-cowork-setup.sh --stop   # Stop mode — kill Angular + ngrok
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
FRONTEND_DIR="$PROJECT_ROOT/apps/web"
AWS_PROFILE="sso-orb-dev"
FRONTEND_URL="http://localhost:4200"
NGROK_URL="https://tameka-overhonest-carefully.ngrok-free.dev"
POLL_TIMEOUT=60

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

info()  { echo "[INFO]  $*"; }
error() { echo "[ERROR] $*" >&2; }

fail() {
  local step="$1"
  shift
  error "Step failed: $step"
  error "$*"
  exit 1
}

# ---------------------------------------------------------------------------
# Start mode steps (sequential, fail-fast)
# ---------------------------------------------------------------------------

step_sso_check() {
  info "Step 1/6: Verifying AWS SSO session (profile: $AWS_PROFILE)..."
  if ! aws --profile "$AWS_PROFILE" sts get-caller-identity > /dev/null 2>&1; then
    fail "AWS SSO check" \
      "SSO session expired or invalid." \
      "Run: aws sso login --profile $AWS_PROFILE"
  fi
  info "AWS SSO session is active."
}

step_npm_install() {
  info "Step 2/6: Installing frontend dependencies..."
  if ! (cd "$FRONTEND_DIR" && npm install); then
    fail "npm install" \
      "npm install failed in $FRONTEND_DIR." \
      "Check your network connection and node_modules."
  fi
  info "Frontend dependencies installed."
}

step_start_angular() {
  info "Step 3/6: Starting Angular dev server in background..."
  (cd "$FRONTEND_DIR" && npm start &)
  local bg_pid=$!
  # Give the process a moment to fail fast (e.g. port conflict)
  sleep 2
  if ! kill -0 "$bg_pid" 2>/dev/null; then
    fail "Angular dev server start" \
      "Angular dev server failed to start." \
      "Check for port conflicts on 4200."
  fi
  info "Angular dev server started (PID $bg_pid)."
}

step_poll_frontend() {
  info "Step 4/6: Polling $FRONTEND_URL (timeout: ${POLL_TIMEOUT}s)..."
  local elapsed=0
  local interval=2
  while [ "$elapsed" -lt "$POLL_TIMEOUT" ]; do
    if curl -s -o /dev/null -w '' "$FRONTEND_URL" 2>/dev/null; then
      info "Frontend is ready at $FRONTEND_URL."
      return 0
    fi
    sleep "$interval"
    elapsed=$((elapsed + interval))
  done
  fail "Frontend poll" \
    "Frontend did not become ready within ${POLL_TIMEOUT} seconds." \
    "Check the Angular dev server logs for errors."
}

step_start_ngrok() {
  info "Step 5/6: Starting ngrok tunnel..."
  if ! (cd "$FRONTEND_DIR" && npm run ngrok); then
    fail "ngrok start" \
      "ngrok failed to start." \
      "Check ngrok auth token and domain reservation."
  fi
}

# ---------------------------------------------------------------------------
# Stop mode — kill Angular dev server and ngrok
# ---------------------------------------------------------------------------

stop_services() {
  info "=== Cowork E2E Setup — Stop Mode ==="
  info ""

  local found=0

  # Kill processes listening on port 4200 (Angular dev server)
  local angular_pids
  angular_pids=$(lsof -ti :4200 2>/dev/null || true)
  if [ -n "$angular_pids" ]; then
    info "Killing Angular dev server (port 4200)..."
    echo "$angular_pids" | xargs kill 2>/dev/null || true
    info "Angular dev server stopped."
    found=1
  fi

  # Kill ngrok processes
  local ngrok_pids
  ngrok_pids=$(pgrep -f ngrok 2>/dev/null || true)
  if [ -n "$ngrok_pids" ]; then
    info "Killing ngrok processes..."
    echo "$ngrok_pids" | xargs kill 2>/dev/null || true
    info "ngrok stopped."
    found=1
  fi

  if [ "$found" -eq 0 ]; then
    info "No processes found to stop."
  else
    info ""
    info "Cleanup complete."
  fi

  exit 0
}

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

main() {
  if [ "${1:-}" = "--stop" ]; then
    stop_services
  fi

  info "=== Cowork E2E Setup — Start Mode ==="
  info ""

  step_sso_check
  step_npm_install
  step_start_angular
  step_poll_frontend

  info ""
  info "Step 6/6: Environment ready."
  info "  Frontend : $FRONTEND_URL"
  info "  ngrok    : $NGROK_URL"
  info ""
  info "Starting ngrok tunnel (this will run in the foreground)..."
  step_start_ngrok
}

main "$@"

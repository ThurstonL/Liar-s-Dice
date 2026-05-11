#!/bin/zsh
set -euo pipefail

agents=(
  com.thepregames.liarsdice.backend
  com.thepregames.liarsdice.frontend
  com.thepregames.liarsdice.tunnel
)

user_domain="gui/$(id -u)"

agent_plist() {
  local name="$1"
  echo "$HOME/Library/LaunchAgents/${name}.plist"
}

agent_is_loaded() {
  local name="$1"
  launchctl print "$user_domain/${name}" >/dev/null 2>&1
}

agent_script() {
  local name="$1"
  case "$name" in
    com.thepregames.liarsdice.backend)
      echo "/Users/thurston/Workspace/Liar-s-Dice/scripts/run_backend.sh"
      ;;
    com.thepregames.liarsdice.frontend)
      echo "/Users/thurston/Workspace/Liar-s-Dice/scripts/run_frontend.sh"
      ;;
    com.thepregames.liarsdice.tunnel)
      echo "/Users/thurston/Workspace/Liar-s-Dice/scripts/run_tunnel.sh"
      ;;
    *)
      echo "Unknown agent: $name" >&2
      return 1
      ;;
  esac
}

agent_log() {
  local name="$1"
  case "$name" in
    com.thepregames.liarsdice.backend)
      echo "/Users/thurston/Workspace/Liar-s-Dice/logs/backend.manual.log"
      ;;
    com.thepregames.liarsdice.frontend)
      echo "/Users/thurston/Workspace/Liar-s-Dice/logs/frontend.manual.log"
      ;;
    com.thepregames.liarsdice.tunnel)
      echo "/Users/thurston/Workspace/Liar-s-Dice/logs/tunnel.manual.log"
      ;;
    *)
      echo "Unknown agent: $name" >&2
      return 1
      ;;
  esac
}

agent_is_healthy() {
  local name="$1"
  case "$name" in
    com.thepregames.liarsdice.backend)
      lsof -nP -iTCP:3001 -sTCP:LISTEN >/dev/null 2>&1
      ;;
    com.thepregames.liarsdice.frontend)
      lsof -nP -iTCP:3000 -sTCP:LISTEN >/dev/null 2>&1
      ;;
    com.thepregames.liarsdice.tunnel)
      pgrep -f "cloudflared tunnel run" >/dev/null 2>&1
      ;;
    *)
      return 1
      ;;
  esac
}

wait_for_loaded_state() {
  local name="$1"
  local expected="$2"
  local attempts="${3:-20}"

  for _ in $(seq 1 "$attempts"); do
    if [[ "$expected" == "loaded" ]] && agent_is_loaded "$name"; then
      return 0
    fi

    if [[ "$expected" == "unloaded" ]] && ! agent_is_loaded "$name"; then
      return 0
    fi

    sleep 0.5
  done

  return 1
}

wait_for_running_state() {
  local name="$1"
  local attempts="${2:-20}"

  for _ in $(seq 1 "$attempts"); do
    if launchctl print "$user_domain/${name}" 2>/dev/null | rg -q 'state = running'; then
      return 0
    fi

    sleep 0.5
  done

  return 1
}

wait_for_health() {
  local name="$1"
  local attempts="${2:-30}"

  for _ in $(seq 1 "$attempts"); do
    if agent_is_healthy "$name"; then
      return 0
    fi
    sleep 0.5
  done

  return 1
}

start_manual_agent() {
  local name="$1"
  local script log
  script="$(agent_script "$name")"
  log="$(agent_log "$name")"

  nohup "$script" </dev/null >>"$log" 2>&1 &
}

kill_orphans() {
  pkill -f "/Users/thurston/Workspace/Liar-s-Dice/server/dist/index.js" 2>/dev/null || true
  pkill -f "http.server 3000" 2>/dev/null || true
  pkill -f "cloudflared tunnel run" 2>/dev/null || true
}

usage() {
  echo "Usage: $0 {install|start|stop|restart|status|logs}"
}

install_agents() {
  local source_dir="/Users/thurston/Workspace/Liar-s-Dice/launchd"
  local target_dir="$HOME/Library/LaunchAgents"

  mkdir -p "$target_dir"

  for agent in "${agents[@]}"; do
    cp "$source_dir/${agent}.plist" "$target_dir/${agent}.plist"
    echo "Installed $target_dir/${agent}.plist"
  done
}

require_agent() {
  local name="$1"
  local plist
  plist="$(agent_plist "$name")"
  if [[ ! -f "$plist" ]]; then
    echo "Missing LaunchAgent: $plist" >&2
    exit 1
  fi
}

start_agent() {
  local agent="$1"
  require_agent "$agent"

  if agent_is_loaded "$agent"; then
    launchctl kickstart -k "$user_domain/${agent}"
  else
    start_manual_agent "$agent"
  fi

  if agent_is_loaded "$agent"; then
    wait_for_running_state "$agent" || true
  fi

  wait_for_health "$agent" || {
    echo "Timed out waiting for $agent to become healthy" >&2
    exit 1
  }
}

stop_agent() {
  local agent="$1"
  local plist
  plist="$(agent_plist "$agent")"

  if agent_is_loaded "$agent"; then
    launchctl bootout "$user_domain/${agent}" 2>/dev/null || launchctl bootout "$user_domain" "$plist"
    wait_for_loaded_state "$agent" unloaded || {
      echo "Timed out unloading $agent" >&2
      exit 1
    }
  fi
}

start_agents() {
  kill_orphans
  sleep 1
  for agent in "${agents[@]}"; do
    start_agent "$agent"
  done
}

restart_agents() {
  kill_orphans
  sleep 1
  for agent in "${agents[@]}"; do
    require_agent "$agent"
    if agent_is_loaded "$agent"; then
      launchctl kickstart -k "$user_domain/${agent}"
      wait_for_running_state "$agent" || {
        echo "Timed out waiting for $agent to restart" >&2
        exit 1
      }
      wait_for_health "$agent" || {
        echo "Timed out waiting for $agent to become healthy after restart" >&2
        exit 1
      }
    else
      start_agent "$agent"
    fi
  done
}

stop_agents() {
  for agent in "${agents[@]}"; do
    stop_agent "$agent"
  done
  kill_orphans
  sleep 2
}

status_agents() {
  for agent in "${agents[@]}"; do
    echo "== $agent =="
    if agent_is_loaded "$agent"; then
      launchctl print "$user_domain/${agent}" 2>/dev/null | sed -n '1,20p'
    elif agent_is_healthy "$agent"; then
      echo "manual fallback running"
    else
      echo "not loaded"
    fi
    echo
  done
}

show_logs() {
  tail -n 40 /Users/thurston/Workspace/Liar-s-Dice/logs/*.log
}

case "${1:-}" in
  install)
    install_agents
    ;;
  start)
    start_agents
    ;;
  stop)
    stop_agents
    ;;
  restart)
    restart_agents
    ;;
  status)
    status_agents
    ;;
  logs)
    show_logs
    ;;
  *)
    usage
    exit 1
    ;;
esac

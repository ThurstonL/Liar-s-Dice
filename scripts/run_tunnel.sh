#!/bin/zsh
set -euo pipefail

cd /Users/thurston/Workspace/Liar-s-Dice
exec /opt/homebrew/bin/cloudflared tunnel run

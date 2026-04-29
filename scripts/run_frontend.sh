#!/bin/zsh
set -euo pipefail

cd /Users/thurston/Workspace/Liar-s-Dice/client/dist
exec /usr/bin/python3 -m http.server 3000

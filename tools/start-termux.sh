#!/data/data/com.termux/files/usr/bin/bash
set -eu
cd "$(dirname "$0")/.."
command -v node >/dev/null 2>&1 || { echo 'Install Node first: pkg install nodejs-lts'; exit 1; }
export HOST=127.0.0.1
export PORT=7000
export PUBLIC_URL=http://127.0.0.1:7000
export DATA_DIR="$PWD/data"
echo 'Open http://127.0.0.1:7000/configure in your phone browser.'
echo 'The phone must be connected to a network where Cinemana works.'
exec node --env-file-if-exists=.env src/server.js

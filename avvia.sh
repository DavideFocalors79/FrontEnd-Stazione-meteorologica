#!/usr/bin/env bash
# avvia.sh — Stazione Meteo
# Uso: chmod +x avvia.sh && ./avvia.sh

set -e

if ! command -v php &>/dev/null; then
    echo "PHP non trovato. Installalo con:"
    echo "  Ubuntu/Debian : sudo apt install php"
    echo "  Mac (Homebrew): brew install php"
    exit 1
fi

PORT=8080
DIR="$(cd "$(dirname "$0")" && pwd)"

echo "Avvio server Stazione Meteo su http://localhost:$PORT ..."
echo "Premi CTRL+C per fermare."
echo ""

# Apre il browser dopo 1 secondo
(sleep 1 && \
    if command -v xdg-open &>/dev/null; then
        xdg-open "http://localhost:$PORT"
    elif command -v open &>/dev/null; then
        open "http://localhost:$PORT"
    fi
) &

php -S "localhost:$PORT" -t "$DIR"

#!/bin/bash
echo "Running pre-start tasks..."

/bin/ollama serve &

exec "$@"

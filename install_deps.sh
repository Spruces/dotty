#!/bin/sh

# install_deps.sh
# Run this after cloning the repo to install any project dependencies.

set -e

if [ -f package.json ]; then
  echo "Found package.json, installing npm dependencies..."
  if command -v npm >/dev/null 2>&1; then
    npm install
  else
    echo "npm is not installed. Please install Node.js and npm first." >&2
    exit 1
  fi
  exit 0
fi

if [ -f pyproject.toml ] || [ -f requirements.txt ]; then
  echo "Found Python dependency files. Installing dependencies..."
  if command -v python3 >/dev/null 2>&1; then
    if [ -f pyproject.toml ]; then
      python3 -m pip install --upgrade pip
      python3 -m pip install -r requirements.txt 2>/dev/null || true
    else
      python3 -m pip install --upgrade pip
      python3 -m pip install -r requirements.txt
    fi
  else
    echo "Python 3 is not installed. Please install Python 3 first." >&2
    exit 1
  fi
  exit 0
fi

echo "No external dependency manifest found."
echo "This project appears to be a static web app and can be run directly by opening index.html or serving the folder with a static server."
exit 0

#!/bin/sh
set -e

if [ -n "$DATABASE_URL" ]; then
  echo "Aplicando schema do banco (prisma db push)..."
  npx prisma db push --skip-generate
fi

echo "Iniciando API RBZ..."
exec node dist/src/main.js

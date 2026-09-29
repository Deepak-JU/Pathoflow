#!/bin/sh
set -e

echo "🔬 [PathoFlow Container Entrypoint] Preparing environment..."

# Run database push to ensure tables exist in Postgres
echo "📦 Running Prisma DB push on PostgreSQL..."
npx prisma db push --skip-generate || true

# Check if seed should be run
if [ "$AUTO_SEED" = "true" ] || [ -z "$AUTO_SEED" ]; then
  echo "🌱 Seeding initial clinical cases and QA data..."
  node -e "
    const { seedDatabase } = require('./dist/db/seed.js');
    seedDatabase().catch(console.error);
  " || true
fi

echo "🚀 Starting PathoFlow LIMS server on port $PORT..."
exec "$@"

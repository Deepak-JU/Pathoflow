#!/bin/sh
set -e

echo "🔬 [PathoFlow Container Entrypoint] Preparing environment..."

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL at postgres:5432..."
until nc -z postgres 5432; do
  sleep 1
done
echo "✅ PostgreSQL is accepting connections."

# Run database push to ensure tables exist in Postgres
echo "📦 Running Prisma DB push on PostgreSQL..."
npx prisma db push --skip-generate

# Seed database
if [ "$AUTO_SEED" = "true" ] || [ -z "$AUTO_SEED" ]; then
  echo "🌱 Seeding initial clinical cases and QA data..."
  node -e "
    const { seedDatabase } = require('./dist/db/seed.js');
    seedDatabase().then(() => {
      console.log('✅ Seed completed successfully.');
      process.exit(0);
    }).catch((err) => {
      console.error('Seed error:', err);
      process.exit(1);
    });
  " || true
fi

echo "🚀 Starting PathoFlow LIMS server on port $PORT..."
exec "$@"

#!/bin/sh
set -e

echo "🔬 [PathoFlow Container Entrypoint] Preparing environment..."

# Wait for MongoDB to be ready
echo "⏳ Waiting for MongoDB at mongodb:27017..."
until nc -z mongodb 27017; do
  sleep 1
done
echo "✅ MongoDB is accepting connections."

# Run database push to ensure indexes and collections exist in MongoDB
echo "📦 Running Prisma DB push on MongoDB..."
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

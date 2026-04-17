#!/bin/bash

# ============================================
# Brain it Platform - Production Startup Script
# ============================================

set -e

echo "🚀 Brain it Platform - Starting..."
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
    echo "✓ Loaded environment configuration from .env"
else
    echo "⚠️  .env file not found. Using defaults from docker-compose.yml"
fi

echo ""
echo "📦 Building Docker images..."
docker-compose build

echo ""
echo "🔄 Starting services..."
docker-compose up -d

echo ""
echo "⏳ Waiting for services to be healthy..."

# Wait for PostgreSQL
echo -n "  Waiting for PostgreSQL..."
max_attempts=30
attempt=0
while ! docker-compose exec -T postgres pg_isready -U ${DB_USER:-brainit_user} > /dev/null 2>&1; do
    if [ $attempt -ge $max_attempts ]; then
        echo "❌ PostgreSQL failed to start"
        exit 1
    fi
    echo -n "."
    sleep 2
    attempt=$((attempt + 1))
done
echo " ✓"

# Wait for Core API
echo -n "  Waiting for Brain it Core..."
attempt=0
while ! curl -s http://localhost:8000/health > /dev/null 2>&1; do
    if [ $attempt -ge $max_attempts ]; then
        echo "❌ Brain it Core failed to start"
        exit 1
    fi
    echo -n "."
    sleep 2
    attempt=$((attempt + 1))
done
echo " ✓"

# Wait for Echo Agent
echo -n "  Waiting for Echo Agent..."
attempt=0
while ! curl -s http://localhost:8001/health > /dev/null 2>&1; do
    if [ $attempt -ge $max_attempts ]; then
        echo "❌ Echo Agent failed to start"
        exit 1
    fi
    echo -n "."
    sleep 2
    attempt=$((attempt + 1))
done
echo " ✓"

# Wait for Transform Agent
echo -n "  Waiting for Transform Agent..."
attempt=0
while ! curl -s http://localhost:8002/health > /dev/null 2>&1; do
    if [ $attempt -ge $max_attempts ]; then
        echo "❌ Transform Agent failed to start"
        exit 1
    fi
    echo -n "."
    sleep 2
    attempt=$((attempt + 1))
done
echo " ✓"

# Wait for Frontend
echo -n "  Waiting for Frontend..."
attempt=0
while ! curl -s http://localhost:3000 > /dev/null 2>&1; do
    if [ $attempt -ge $max_attempts ]; then
        echo "❌ Frontend failed to start"
        exit 1
    fi
    echo -n "."
    sleep 2
    attempt=$((attempt + 1))
done
echo " ✓"

echo ""
echo "✅ All services are healthy!"
echo ""
echo "📍 Service URLs:"
echo "   Frontend:        http://localhost:3000"
echo "   Brain it Core:   http://localhost:8000"
echo "   Echo Agent:      http://localhost:8001"
echo "   Transform Agent: http://localhost:8002"
echo "   PostgreSQL:      localhost:5432"
echo ""
echo "🛑 To stop all services, run: docker-compose down"
echo "📊 To view logs, run: docker-compose logs -f [service-name]"
echo ""

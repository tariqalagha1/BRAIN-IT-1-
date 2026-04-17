# Brain it Platform - Production Deployment Guide

## Overview

Brain it Platform is a distributed multi-agent orchestration system designed for production deployment. This guide covers:

- **Local Docker Deployment**: Run the entire system with `docker-compose up`
- **Service Architecture**: 5-service microservices stack with PostgreSQL
- **Health Checks**: Automated service health monitoring
- **Production Configuration**: Environment-based configuration management

## Quick Start

### Prerequisites

- Docker Desktop (version 20.10+)
- curl (for testing)
- Git

### Launch the Platform

**Linux/macOS:**
```bash
bash start.sh
```

**Windows:**
```powershell
.\start.ps1
```

**Manual (all platforms):**
```bash
docker-compose up
```

All services will be:
- Built from source
- Started in correct order
- Health-checked automatically
- Accessible at configured URLs

### Service URLs

| Service       | URL                  | Port |
|---------------|----------------------|------|
| Frontend      | http://localhost:3000| 3000 |
| Brain it Core | http://localhost:8000 | 8000 |
| Echo Agent    | http://localhost:8001 | 8001 |
| Transform Agent | http://localhost:8002 | 8002 |
| PostgreSQL    | localhost:5432       | 5432 |

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                  Frontend (Next.js)                 │
│                 :3000                               │
└────────────────────┬────────────────────────────────┘
                     │ HTTP
         ┌───────────┴──────────────┐
         ▼                          ▼
┌─────────────────────┐    ┌──────────────────┐
│  Brain it Core API  │    │ Agent Services   │
│  (Orchestrator)     │    │                  │
│  :8000              │    ├─ Echo Agent :8001│
│                     │    ├─ Transform :8002 │
│  - Task Routing     │    └──────────────────┘
│  - Agent Registry   │
│  - A2A Messaging    │
│  - Usage Tracking   │
└────────┬────────────┘
         │ SQL
         ▼
    ┌─────────────┐
    │ PostgreSQL  │
    │  :5432      │
    │ (brainit_db)│
    └─────────────┘
```

## Configuration

### Environment Variables

Configuration is managed via `.env` file (auto-loaded by docker-compose):

```bash
# Database
DB_USER=brainit_user
DB_PASSWORD=secure_password
DB_NAME=brainit_db

# Application
APP_ENV=production
APP_NAME=Brain it Platform
LOG_LEVEL=INFO

# API
ECHO_AGENT_URL=http://echo-agent:8001
TRANSFORM_AGENT_URL=http://transform-agent:8002

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:8000
```

See `.env.example` for all available options.

### Changing Configuration

1. Edit `.env` file
2. Run: `docker-compose up --force-recreate`
3. Services will restart with new configuration

## Service Details

### Brain it Core (Orchestrator)

Main API that:
- Routes tasks to agents
- Manages agent registry
- Handles A2A (Agent-to-Agent) communication
- Tracks API usage and rate limits
- Authenticates requests via API keys

**Health Check:** `curl http://localhost:8000/health`

Endpoints:
- `POST /v1/orchestrate` - Submit task
- `GET /v1/tasks/{task_id}` - Get task status
- `GET /v1/agents` - List registered agents
- `POST /v1/agents` - Register new agent

### Echo Agent Service

Simple demo agent that echoes input text.

**Health Check:** `curl http://localhost:8001/health`

### Transform Agent Service

Demo agent that transforms text (uppercase/lowercase/reverse).

**Health Check:** `curl http://localhost:8002/health`

### PostgreSQL Database

Persistent storage for:
- Tasks and execution history
- Agent registry
- API usage logs
- User API keys

**Connection:**
```bash
psql -h localhost -p 5432 -U brainit_user -d brainit_db
```

Default password: Check `.env` file

## Common Operations

### View Service Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f brainit-core
docker-compose logs -f echo-agent
docker-compose logs -f postgres
```

### Stop Services

```bash
docker-compose down
```

Data persists in PostgreSQL volume.

### Stop Services and Remove Data

```bash
docker-compose down -v
```

This removes all volumes including database.

### Restart a Service

```bash
docker-compose restart brainit-core
```

### Check Service Health Status

```bash
docker-compose ps
```

### Access Database Shell

```bash
docker-compose exec postgres psql -U brainit_user -d brainit_db
```

## Testing Deployment

### 1. Check All Services Are Running

```bash
docker-compose ps
```

Expected output:
```
NAME                    STATUS
brainit-postgres        healthy
brainit-core-api        healthy
brainit-echo-agent      healthy
brainit-transform-agent healthy
brainit-frontend        healthy
```

### 2. Test API Health

```bash
curl http://localhost:8000/health
```

Expected response:
```json
{
  "status": "ok",
  "service": "brainit-core",
  "database": "ok"
}
```

### 3. Test Agent Health

```bash
curl http://localhost:8001/health
curl http://localhost:8002/health
```

### 4. Test Frontend

Open browser: http://localhost:3000

### 5. Test Task Submission

```bash
curl -X POST http://localhost:8000/v1/orchestrate \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{
    "task_type": "echo",
    "input_payload": {"text": "hello"}
  }'
```

## Deployment Considerations

### Production Checklist

- [ ] Update `SECRET_KEY` in `.env` to a secure random value
- [ ] Update database passwords to strong values
- [ ] Set `APP_ENV=production`
- [ ] Set `LOG_LEVEL=WARNING` or `ERROR` (reduces output)
- [ ] Update `NEXT_PUBLIC_API_URL` to your domain
- [ ] Configure proper CORS origins if needed
- [ ] Set up database backups for PostgreSQL volume
- [ ] Configure reverse proxy (nginx/Caddy) for TLS
- [ ] Monitor disk space for logs and database

### Performance Tuning

For production deployments with high load:

1. **Database Connection Pool**: Already configured with pool_size=10, max_overflow=20
2. **Docker Resource Limits**: Add to docker-compose if needed:
   ```yaml
   deploy:
     resources:
       limits:
         cpus: '2'
         memory: 2G
   ```
3. **Logging Level**: Set LOG_LEVEL=WARNING to reduce I/O

### Scaling

To scale agent services horizontally:

```bash
docker-compose up -d --scale echo-agent=3
```

Then update load balancing in orchestrator.

## Troubleshooting

### Service Fails to Start

1. Check logs: `docker-compose logs service-name`
2. Verify `.env` file exists and has valid values
3. Ensure ports 3000, 8000, 8001, 8002, 5432 are available
4. Check Docker daemon is running

### Database Connection Error

```
ERROR: could not connect to database server
```

1. Verify PostgreSQL container is healthy: `docker-compose ps`
2. Check DB credentials in `.env`
3. Reinitialize: `docker-compose down -v && docker-compose up`

### Frontend Can't Connect to API

1. Check NEXT_PUBLIC_API_URL in `.env`
2. Verify brainit-core is healthy: `curl http://localhost:8000/health`
3. Check browser console for network errors
4. Verify CORS configuration if behind proxy

### Container Exits Immediately

1. Check logs: `docker-compose logs service-name`
2. Verify dependencies are healthy (check `depends_on`)
3. Verify environment variables are valid

## Database Migrations

### Using Alembic (Optional)

Alembic setup is available for advanced schema management:

```bash
# Generate new migration after model changes
alembic revision --autogenerate -m "description"

# Apply migrations
alembic upgrade head

# Rollback
alembic downgrade -1
```

The system automatically creates tables on first run.

## Security Notes

1. **Never commit `.env` to version control** - only commit `.env.example`
2. **Rotate API keys regularly** via the dashboard
3. **Use strong database passwords** (minimum 16 characters)
4. **Enable TLS/HTTPS** in production via reverse proxy
5. **Rate limiting** is enabled by default based on API key plan
6. **Database backups** are essential for production

## Support

For issues or questions:
- Check logs: `docker-compose logs -f`
- Verify stack is healthy: `docker-compose ps`
- Review error messages in service logs
- Ensure `.env` configuration is valid

## Next Steps

1. Customize agent services with your business logic
2. Register additional agents via `/v1/agents` endpoint
3. Configure API keys and rate limits for clients
4. Set up monitoring and alerting
5. Plan for database backup strategy

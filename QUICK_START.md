# Brain it Platform - Phase 7 Quick Start Checklist

## Pre-Launch Setup (Choose Your Platform)

### Windows
```powershell
# 1. Verify Docker Desktop is running
# 2. Navigate to project directory
cd C:\Users\admin\Downloads\Project\ClinicalMind

# 3. Copy environment template
Copy-Item .env.example .env

# 4. Edit .env with your values
notepad .env

# 5. Launch platform
.\start.ps1

# 6. If script fails due to execution policy:
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
.\start.ps1
```

### Linux / macOS
```bash
# 1. Verify Docker is running
docker ps

# 2. Navigate to project directory
cd ~/Projects/ClinicalMind

# 3. Copy environment template
cp .env.example .env

# 4. Edit with your values
nano .env

# 5. Launch platform
bash start.sh
```

### Manual Launch (All Platforms)
```bash
# If scripts don't work, use docker-compose directly
docker-compose up
```

## Verify All Services Running

```bash
# Check status
docker-compose ps

# Expected output:
# NAME                    STATUS            PORTS
# brainit-postgres        Up (healthy)      5432/tcp
# brainit-core-api        Up (healthy)      8000/tcp
# brainit-echo-agent      Up (healthy)      8001/tcp
# brainit-transform-agent Up (healthy)      8002/tcp
# brainit-frontend        Up (healthy)      3000/tcp
```

## Access Services

| Service  | URL                  |
|----------|----------------------|
| Frontend | http://localhost:3000 |
| Core API | http://localhost:8000 |
| Docs     | http://localhost:8000/docs |

## Test API Health

```bash
# Test core API
curl http://localhost:8000/health

# Expected: {"status":"ok","service":"brainit-core","database":"ok"}

# Test agents
curl http://localhost:8001/health
curl http://localhost:8002/health
```

## Common Commands

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f brainit-core
```

### Stop Services
```bash
# Keep data
docker-compose stop

# Remove containers
docker-compose down

# Remove everything (including database!)
docker-compose down -v
```

### Restart Service
```bash
docker-compose restart brainit-core
```

### Access Database
```bash
docker-compose exec postgres psql -U brainit_user -d brainit_db
```

## File Reference

| File | Purpose |
|------|---------|
| `.env` | Your configuration (DO NOT commit) |
| `.env.example` | Configuration template |
| `docker-compose.yml` | 5-service orchestration |
| `start.sh` | Linux/macOS launcher |
| `start.ps1` | Windows launcher |
| `DEPLOYMENT.md` | Full deployment guide |
| `PHASE_7_SUMMARY.md` | Implementation details |

## Troubleshooting

### "Docker command not found"
→ Install Docker Desktop from docker.com

### "Port already in use"
→ Another service owns port 3000/8000/8001/8002/5432
→ Stop conflicting service or change port in docker-compose.yml

### "Database connection refused"
→ PostgreSQL container not healthy
→ Run: `docker-compose logs postgres`

### "Cannot pull postgresql:16-alpine"
→ Docker not running
→ Docker may be pulling large image (wait)

### "Frontend can't connect to API"
→ Check NEXT_PUBLIC_API_URL in .env
→ Verify brainit-core is healthy

## Production Deployment

Before deploying to production:

1. **Security:**
   - Generate new SECRET_KEY (256-bit hex string)
   - Set strong DB_PASSWORD (20+ characters)
   - Use HTTPS via reverse proxy

2. **Configuration:**
   - Update NEXT_PUBLIC_API_URL to production domain
   - Set APP_ENV=production
   - Set LOG_LEVEL=WARNING

3. **Database:**
   - Set up automated backups
   - Verify volume mount persists

4. **Monitoring:**
   - Set up log aggregation
   - Monitor disk space
   - Set up alerts for service failures

## Next Steps

1. ✅ Launch with `docker-compose up` or startup script
2. ✅ Verify all services healthy
3. ✅ Open http://localhost:3000 in browser
4. ✅ Create API key in dashboard
5. ✅ Submit test task via API
6. ✅ Monitor usage in dashboard

## Architecture Overview

```
User Browser (localhost:3000)
    ↓
Next.js Frontend
    ↓ HTTP
Brain it Core (localhost:8000)
    ├→ Echo Agent (localhost:8001)
    ├→ Transform Agent (localhost:8002)
    └→ PostgreSQL (localhost:5432)
```

## Documentation

- **Quick**: This file
- **Comprehensive**: DEPLOYMENT.md
- **Technical**: PHASE_7_SUMMARY.md
- **Docker Compose**: docker-compose.yml (see inline comments)

## Support

If services won't start:

1. Check logs: `docker-compose logs -f`
2. Verify .env exists and is valid
3. Ensure 3000, 8000, 8001, 8002, 5432 are free
4. Try: `docker-compose down -v && docker-compose up`

Good luck! 🚀

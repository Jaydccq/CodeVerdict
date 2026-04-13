# Load Tests

k6 load-test suite for the CodeVerdict MCQ student flow.

## Quick Start (Local)

### Prerequisites
1. PostgreSQL running locally
2. Server running: `cd server && npm run start:dev`
3. k6 installed locally (`choco install k6`) **or** Docker (the run script uses Docker by default)

### Setup
```bash
cp load-tests/.env.example load-tests/.env.local
# Edit .env.local with your local admin credentials
```

### Run load test
```bash
./load-tests/run-load.sh
# Reports: load-tests/reports/summary-*.html
```

For a local smoke test, use small VU counts in `.env.local`:
```
VUS=10
THINK_TIME=15
```

## Create a local admin account (first time only)

```bash
curl -X POST http://localhost:3000/api/admin/register \
  -H "Content-Type: application/json" \
  -d '{
    "setupKey": "<your ADMIN_SETUP_KEY from server/.env>",
    "rollNumber": "localadmin",
    "firstName": "Local",
    "lastName": "Admin",
    "email": "admin@local.test",
    "password": "Admin@1234"
  }'
# Expected: 201 {"accessToken":"...","user":{"id":...,"role":"ADMIN",...}}
# Then set in .env.local:
#   ADMIN_EMAIL=admin@local.test
#   ADMIN_PASSWORD=Admin@1234
```

## Pre-test server config (for full 120-VU load test)

Before running k6 at full scale, add to `server/.env` and restart:
```
THROTTLE_LIMIT=10000
DB_POOL_SIZE=50
```
Restore `THROTTLE_LIMIT=200` and `DB_POOL_SIZE=10` after the test.

## Switching to production

Change in `.env.local`:
```
BASE_URL=https://your-new-domain.up.railway.app
```

Also set in Railway env vars before the load test:
```
THROTTLE_LIMIT=10000
DB_POOL_SIZE=50
```

No code changes needed.

## Test suite overview

| Suite | Tool | Purpose | VUs |
|-------|------|---------|-----|
| main.js | k6 | Performance - 3-stage spike load | 30/80/120 |

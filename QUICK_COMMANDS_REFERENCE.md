# ⚡ QUICK REFERENCE - Copy & Use These Commands

Use this file for copy-paste commands. All are for Windows PowerShell.

NOTE: Docker Compose now lives at backend/docker-compose.yml and reads variables
from backend/.env. For any compose command, add:
--env-file backend/.env -f backend/docker-compose.yml

---

## SECTION 1: VERIFICATION COMMANDS (Before You Start)

### Check if prerequisites installed:
```powershell
docker --version
python --version
npm --version
node --version
```

Expected output:
```
Docker version 24.x.x
Python 3.11.x
npm 9.x.x
v18.x.x
```

---

## SECTION 2: PROJECT SETUP (First Time Only)

### Navigate to project:
```powershell
cd "c:\Users\KIIT0001\Downloads\Sixth Semester\DataEngineeringProject"
```

### Create .env from template:
```powershell
Copy-Item backend/.env.example backend/.env
Get-Content backend/.env  # Verify it was created
```

### Verify Docker is running:
```powershell
docker ps
```

---

## SECTION 3: DOCKER COMMANDS (Main Infrastructure)

### Start all services:
```powershell
docker-compose --env-file backend/.env -f backend/docker-compose.yml up -d --build
```

### Check services status:
```powershell
docker-compose --env-file backend/.env -f backend/docker-compose.yml ps
```

Expected output (all should be running):
```
NAME                    STATUS
weather-postgres        Up (healthy)
weather-airflow-postgres Up (healthy)
weather-airflow         Up (healthy)
weather-airflow-scheduler Up (healthy)
weather-backend         Up (healthy)
```

### View logs from all services:
```powershell
docker-compose --env-file backend/.env -f backend/docker-compose.yml logs -f
```

### View logs from specific service:
```powershell
docker-compose --env-file backend/.env -f backend/docker-compose.yml logs -f weather-postgres
docker-compose --env-file backend/.env -f backend/docker-compose.yml logs -f weather-airflow
docker-compose --env-file backend/.env -f backend/docker-compose.yml logs -f weather-backend
```

### Stop all services:
```powershell
docker-compose --env-file backend/.env -f backend/docker-compose.yml down
```

### Stop and remove all data (fresh start):
```powershell
docker-compose --env-file backend/.env -f backend/docker-compose.yml down -v
```

### Restart specific service:
```powershell
docker-compose --env-file backend/.env -f backend/docker-compose.yml restart weather-postgres
docker-compose --env-file backend/.env -f backend/docker-compose.yml restart weather-airflow
```

---

## SECTION 4: DATABASE COMMANDS (PostgreSQL)

### Connect to Data Warehouse:
```powershell
docker exec -it weather-postgres psql -U weather_user -d weather_dw
```

Then in psql:
```sql
-- List all tables
\dt

-- Check fact_weather row count
SELECT COUNT(*) FROM fact_weather;

-- View recent data
SELECT * FROM fact_weather ORDER BY created_at DESC LIMIT 10;

-- Exit psql
\q
```

### Direct SQL query (no interactive):
```powershell
docker exec weather-postgres psql -U weather_user -d weather_dw -c "SELECT COUNT(*) FROM fact_weather;"
```

### Connect to Airflow metadata database:
```powershell
docker exec -it weather-airflow-postgres psql -U airflow_user -d airflow_metadata
```

### Back up database (create SQL dump):
```powershell
docker exec weather-postgres pg_dump -U weather_user -d weather_dw > backup.sql
```

### Restore database from backup:
```powershell
docker exec -i weather-postgres psql -U weather_user -d weather_dw < backup.sql
```

---

## SECTION 5: AIRFLOW COMMANDS (DAG Orchestration)

### Access Airflow Web UI:
```
http://localhost:8080
Username: airflow
Password: airflow (or what you set in .env)
```

### Trigger DAG from command line:
```powershell
docker exec weather-airflow airflow dags trigger weather_etl_pipeline
```

### List all DAGs:
```powershell
docker exec weather-airflow airflow dags list
```

### Check DAG status:
```powershell
docker exec weather-airflow airflow dags list-runs --dag-id weather_etl_pipeline
```

### View DAG structure:
```powershell
docker exec weather-airflow airflow tasks list weather_etl_pipeline
```

### Reset DAG (clear all previous runs):
```powershell
docker exec weather-airflow airflow dags delete weather_etl_pipeline
```

### Enable DAG through CLI:
```powershell
docker exec weather-airflow airflow dags unpause weather_etl_pipeline
```

### Disable DAG:
```powershell
docker exec weather-airflow airflow dags pause weather_etl_pipeline
```

---

## SECTION 6: BACKEND API COMMANDS (FastAPI)

### Navigate to backend:
```powershell
cd backend
```

### Create virtual environment:
```powershell
python -m venv venv
```

### Activate virtual environment (Windows):
```powershell
.\venv\Scripts\activate
```

### Install dependencies:
```powershell
pip install -r requirements.txt
```

### Run backend server:
```powershell
python main.py
```

Or with live reload:
```powershell
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Test backend endpoints:

#### Test health check:
```powershell
curl http://localhost:8000/health
```

#### Test API docs:
```
http://localhost:8000/docs
http://localhost:8000/redoc
```

#### Test temperature trends endpoint:
```powershell
curl http://localhost:8000/api/temperature-trends
```

#### Test weather summary endpoint:
```powershell
curl http://localhost:8000/api/weather-summary
```

### Install additional packages (if needed):
```powershell
pip install package_name==version
```

### Deactivate virtual environment:
```powershell
deactivate
```

---

## SECTION 7: FRONTEND COMMANDS (React)

### Navigate to frontend:
```powershell
cd frontend
```

### Install dependencies:
```powershell
npm install
```

### Start dev server (http://localhost:5173):
```powershell
npm run dev
```

### Build for production:
```powershell
npm run build
```

### Preview production build:
```powershell
npm run preview
```

### Check for linting issues:
```powershell
npm run lint
```

### Clean node_modules (if having issues):
```powershell
Remove-Item -Recurse -Force node_modules
npm install
```

---

## SECTION 8: MULTI-TERMINAL SETUP (Run Everything)

### Terminal 1: Docker Infrastructure
```powershell
# From project root
docker-compose up -d

# Watch logs
docker-compose logs -f
```

### Terminal 2: Backend API
```powershell
# From project root
cd backend
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
python main.py
```

### Terminal 3: Frontend Dev Server
```powershell
# From project root
cd frontend
npm install
npm run dev
```

Then open browser:
- http://localhost:5173 (Frontend Dashboard)
- http://localhost:8000/docs (Backend API Docs)
- http://localhost:8080 (Airflow UI)

---

## SECTION 9: COMMON TROUBLESHOOTING COMMANDS

### Check if port is in use:
```powershell
netstat -ano | findstr :8000
netstat -ano | findstr :5432
netstat -ano | findstr :8080
```

### Kill process using port (e.g., port 8000):
```powershell
$process = Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue
Stop-Process -Id $process.OwningProcess -Force
```

### Clear Docker cache and rebuild:
```powershell
docker system prune -a
docker-compose build --no-cache
```

### Rebuild services:
```powershell
docker-compose build
docker-compose up -d
```

### View image sizes:
```powershell
docker images
```

### Remove unused Docker resources:
```powershell
docker system prune
```

### Docker stats (monitor resource usage):
```powershell
docker stats
```

---

## SECTION 10: FILE INSPECTION COMMANDS

### View .env file:
```powershell
Get-Content .env | head -20  # First 20 lines
Get-Content .env  # All lines
```

### Search in .env:
```powershell
Select-String -Path .env -Pattern "POSTGRES"
```

### View requirements.txt:
```powershell
Get-Content backend\requirements.txt
```

### View package.json:
```powershell
Get-Content frontend\package.json
```

### Check file size:
```powershell
(Get-Item docker-compose.yml).Length
```

### List all files in directory tree:
```powershell
Get-ChildItem -Recurse -File | ForEach-Object { $_.FullName }
```

---

## SECTION 11: ONE-LINERS FOR QUICK TESTING

### Full status check:
```powershell
Write-Host "Docker:"; docker --version
Write-Host "Python:"; python --version
Write-Host "npm:"; npm --version
Write-Host "Services:"; docker-compose ps
Write-Host "API Health:"; curl http://localhost:8000/health
```

### Quick data verification:
```powershell
docker exec weather-postgres psql -U weather_user -d weather_dw -c "SELECT COUNT(*) as total_records FROM fact_weather;"
```

### Check if all services are healthy:
```powershell
docker-compose ps | Select-String "healthy"
```

### Trigger DAG and check status:
```powershell
docker exec weather-airflow airflow dags trigger weather_etl_pipeline
Start-Sleep -Seconds 5
docker exec weather-airflow airflow dags list-runs --dag-id weather_etl_pipeline
```

---

## SECTION 12: HELPFUL SCRIPTS

### Check everything at once:
```powershell
$ErrorActionPreference = "SilentlyContinue"

Write-Host "=== INSTALLATION CHECK ===" -ForegroundColor Green
Write-Host "Docker:" $(docker --version)
Write-Host "Python:" $(python --version)
Write-Host "Node.js:" $(node --version)
Write-Host "npm:" $(npm --version)

Write-Host "`n=== DOCKER SERVICES ===" -ForegroundColor Green
docker-compose ps

Write-Host "`n=== DATABASE CHECK ===" -ForegroundColor Green
$rowcount = docker exec weather-postgres psql -U weather_user -d weather_dw -c "SELECT COUNT(*) FROM fact_weather;" 2>$null
Write-Host "Weather records in DB: $rowcount"

Write-Host "`n=== API CHECK ===" -ForegroundColor Green
$health = curl http://localhost:8000/health 2>$null
Write-Host "Backend health: $health"

Write-Host "`n✓ All checks complete!" -ForegroundColor Green
```

### Clean and restart everything:
```powershell
Write-Host "Stopping services..." -ForegroundColor Yellow
docker-compose down

Write-Host "Removing old volumes..." -ForegroundColor Yellow
docker volume rm postgres_dw_data postgres_airflow_data

Write-Host "Rebuilding images..." -ForegroundColor Yellow
docker-compose build

Write-Host "Starting fresh..." -ForegroundColor Yellow
docker-compose up -d

Start-Sleep -Seconds 10
docker-compose ps

Write-Host "✓ Ready!" -ForegroundColor Green
```

---

## SECTION 13: MONITORING & LOGS

### Tail logs in real-time (all services):
```powershell
docker-compose logs -f --tail=50
```

### Tail logs from specific service:
```powershell
docker-compose logs -f weather-airflow
```

### Get last 100 lines of logs:
```powershell
docker-compose logs --tail=100
```

### Export logs to file:
```powershell
docker-compose logs > docker-logs.txt
```

### Monitor resource usage:
```powershell
docker stats --no-stream
```

---

## 💡 TIPS & TRICKS

**Tip 1:** Open multiple PowerShell windows using:
```powershell
Start-Process pwsh  # Opens new PowerShell window
```

**Tip 2:** Navigate to exact directory quickly:
```powershell
Set-Location -Path "c:\Users\KIIT0001\Downloads\Sixth Semester\DataEngineeringProject"
```

**Tip 3:** Set up aliases for long commands:
```powershell
function dc { docker-compose --env-file backend/.env -f backend/docker-compose.yml @args }
# Now use: dc ps  (instead of: docker-compose --env-file backend/.env -f backend/docker-compose.yml ps)
```

**Tip 4:** Run command and capture output:
```powershell
$output = docker-compose --env-file backend/.env -f backend/docker-compose.yml ps | Out-String
Write-Host $output
```

**Tip 5:** Time a command:
```powershell
Measure-Command { docker-compose --env-file backend/.env -f backend/docker-compose.yml up -d }
```

---

## 📋 COPY-PASTE WORKFLOW

### First time setup (copy-paste in order):
```powershell
cd "c:\Users\KIIT0001\Downloads\Sixth Semester\DataEngineeringProject"
Copy-Item backend/.env.example backend/.env
docker-compose --env-file backend/.env -f backend/docker-compose.yml up -d
Start-Sleep -Seconds 15
docker-compose --env-file backend/.env -f backend/docker-compose.yml ps
```

### Run everything (open 3 terminals):

**Terminal 1:**
```powershell
cd "c:\Users\KIIT0001\Downloads\Sixth Semester\DataEngineeringProject"
docker-compose --env-file backend/.env -f backend/docker-compose.yml logs -f
```

**Terminal 2:**
```powershell
cd "c:\Users\KIIT0001\Downloads\Sixth Semester\DataEngineeringProject\backend"
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
python main.py
```

**Terminal 3:**
```powershell
cd "c:\Users\KIIT0001\Downloads\Sixth Semester\DataEngineeringProject\frontend"
npm install
npm run dev
```

### Then in browser:
```
Airflow: http://localhost:8080 (user: airflow, pass: airflow)
Backend: http://localhost:8000/docs
Frontend: http://localhost:5173
```

---

## ⚠️ EMERGENCY COMMANDS

If something goes wrong, try these in order:

```powershell
# Step 1: Stop everything
docker-compose down

# Step 2: Remove potentially corrupted volumes
docker volume prune

# Step 3: Kill any stuck processes
Get-Process | Where-Object {$_.ProcessName -like "*python*"} | Stop-Process -Force
Get-Process | Where-Object {$_.ProcessName -like "*node*"} | Stop-Process -Force

# Step 4: Start fresh
docker-compose build --no-cache
docker-compose up -d

# Step 5: Wait and check
Start-Sleep -Seconds 20
docker-compose ps
```

---

## 🔧 USEFUL DOCKER COMPOSE OPTIONS

```powershell
# Rebuild before starting
docker-compose up --build

# Run single service
docker-compose up -d weather-postgres

# Run with specific environment file
docker-compose --env-file .env.production up -d

# Scale service replicas
docker-compose up -d --scale weather-backend=3

# Remove only stopped containers
docker-compose rm

# View configuration
docker-compose config
```

---

**Save this file and come back anytime you need a quick command!** 📌

Use Ctrl+F to search for what you need. Most commands are self-explanatory.

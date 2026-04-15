# 🚀 QUICKSTART GUIDE - Weather Forecast Analytical DB

Complete instructions to get the entire data engineering project running in 15 minutes.

---

## ✅ Prerequisites

Verify you have these installed:
```bash
# Docker & Docker Compose
docker --version
docker-compose --version

# Python (for local Airflow development)
python --version  # Need 3.9+

# Node.js (for frontend)
node --version    # Need 16+
npm --version
```

If you don't have these, install from:
- Docker: https://docs.docker.com/get-docker/
- Python: https://www.python.org/downloads/
- Node.js: https://nodejs.org/

---

## 📋 Step 1: Clone & Navigate

```bash
cd DataEngineeringProject
```

---

## 🔧 Step 2: Configure Environment Variables

```bash
# Copy template to .env
cp backend/.env.example backend/.env

# Edit .env and change passwords (optional for local dev):
# POSTGRES_PASSWORD=change_me_123!
# AIRFLOW_POSTGRES_PASSWORD=change_me_456!
```

Note: `backend/.env.example` defaults `POSTGRES_PORT=5434` to avoid local port conflicts. Change it to `5432` in `backend/.env` if you want the standard PostgreSQL port.

**On Windows (PowerShell):**
```powershell
Copy-Item backend/.env.example backend/.env
# Edit .env in your editor
```

---

## 🐳 Step 3: Start Docker Infrastructure (3 minutes)

This starts PostgreSQL (Data Warehouse + Airflow), Airflow Webserver, and Airflow Scheduler.

```bash
# Build and start all services
docker-compose --env-file backend/.env -f backend/docker-compose.yml up -d --build

# Watch startup (press Ctrl+C to stop watching)
docker-compose --env-file backend/.env -f backend/docker-compose.yml logs -f

# Wait until all services are healthy
docker-compose --env-file backend/.env -f backend/docker-compose.yml ps
```

**Verify all containers are running:**
```bash
docker ps
# Should show 5 containers: postgres, airflow-postgres, airflow, airflow-scheduler, backend
```


## 📊 Step 4: Initialize Database Schema (1 minute)

Wait until `weather-postgres` is healthy, then initialize the star schema:

```bash
# On Linux/Mac or Windows PowerShell:
docker exec weather-postgres psql -U weather_user -d weather_dw -f /docker-entrypoint-initdb.d/init.sql
```

**Verify (optional):**
```bash
docker exec weather-postgres psql -U weather_user -d weather_dw -c "SELECT * FROM dim_location;"
# Should include: New York, London, Tokyo, New Delhi, Mumbai, Bengaluru, Chennai, Kolkata
```

---

## 🌐 Step 5: Access Airflow UI (1 minute)

1. Open browser: http://localhost:8080
2. Login:
   - Username: `airflow`
   - Password: `airflow`
3. Enable and trigger the DAG:
   - Click `weather_etl_pipeline` DAG
   - Click toggle to enable it
   - Click "Trigger DAG" button
   - Watch the graph view as tasks execute

**Pipeline Stages:**
- Green ✓ = Task completed successfully
- Red ✗ = Task failed
- Yellow ⏸ = Task running

**Expected Duration:** ~30 seconds for all 3 tasks

[Dashboard Screenshot: Airflow UI with DAG execution]

---

## 🚀 Step 6: Start Backend API (1 minute)

If you started Docker Compose, the backend is already running at http://localhost:8000.

To run the backend locally instead, stop the container and start it yourself:

In a **new terminal**, navigate to `backend` folder:

```bash
docker-compose --env-file backend/.env -f backend/docker-compose.yml stop weather-backend
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Linux/Mac:
source venv/bin/activate
# On Windows:
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file (optional, uses defaults)
cp .env.example .env
# Run server
python main.py
```

**Verify API is running:**
- Swagger Docs: http://localhost:8000/docs
- Health Check: http://localhost:8000/health

---

## 💻 Step 7: Start Frontend Dashboard (1 minute)

In a **new terminal**, navigate to `frontend` folder:

```bash
cd frontend

# Install dependencies
npm install

# Create .env file
cp .env.example .env.local

# Start dev server
npm run dev
```

**Access Dashboard:**
- Open browser: http://localhost:5173
- Should see dashboard with 2 charts
- Charts show weather data from PostgreSQL

---


```
1. INGESTION    ✓ Airflow DAG fetches from Open-Meteo API
2. PROCESSING   ✓ Airflow DAG cleans and transforms data with Pandas
3. STORAGE      ✓ PostgreSQL star schema stores processed data
4. ORCHESTRATION ✓ Airflow scheduler orchestrates daily DAG runs
5. DASHBOARD    ✓ React frontend displays charts
```

**Test Complete Flow:**

```bash
# 1. Check PostgreSQL has data
docker exec weather-postgres psql -U weather_user -d weather_dw \
  -c "SELECT COUNT(*) FROM fact_weather;"

# Should show: count > 0

# 2. Check API endpoints
# Should show JSON data

# 3. Open dashboard
# http://localhost:5173
# Should see 2 filled charts
```

---

## 📅 Step 9: Schedule Daily Runs (Optional)

The DAG is configured to run daily at 6:00 AM UTC.

To test the schedule:
1. In Airflow UI, edit DAG:
   - Click "weather_etl_pipeline"
   - Click "Edit" (pencil icon)
   - Change `schedule_interval='0 6 * * *'` to `schedule_interval='*/5 * * * *'` (every 5 min)
2. Save and reload Airflow:
   ```bash
   docker restart weather-airflow weather-airflow-scheduler
   ```

---

## 🛑 Stopping Services

```bash
# Stop frontend (Ctrl+C in frontend terminal)
# Stop backend (Ctrl+C in backend terminal)

# Stop Docker services
docker-compose --env-file backend/.env -f backend/docker-compose.yml down

docker-compose --env-file backend/.env -f backend/docker-compose.yml up -d --build
docker-compose --env-file backend/.env -f backend/docker-compose.yml down -v
```
docker-compose --env-file backend/.env -f backend/docker-compose.yml logs -f
---

docker-compose --env-file backend/.env -f backend/docker-compose.yml ps

After stopping:

```bash
# Restart everything
docker-compose --env-file backend/.env -f backend/docker-compose.yml up -d

cd backend
python main.py

# Restart frontend
cd frontend
npm run dev
```

---

docker-compose --env-file backend/.env -f backend/docker-compose.yml stop weather-backend

### View Docker Logs
```bash
# All services
docker-compose --env-file backend/.env -f backend/docker-compose.yml logs -f

# Specific service
docker logs weather-airflow -f
docker logs weather-postgres -f
```

### View Airflow Logs
- In Airflow UI: http://localhost:8080
- Click DAG > "Logs" tab
- Click task > "Log" tab

### Database Queries
```bash
# Connect to PostgreSQL
docker exec -it weather-postgres psql -U weather_user -d weather_dw

# Useful queries:
SELECT * FROM vw_temperature_trends_7day LIMIT 10;
```

---

## 🐛 Troubleshooting

### "Connection refused" when accessing services
```bash
docker-compose --env-file backend/.env -f backend/docker-compose.yml down
docker ps

docker-compose --env-file backend/.env -f backend/docker-compose.yml down -v
docker-compose --env-file backend/.env -f backend/docker-compose.yml logs
```
### "Database connection failed" in backend
- Wait 30 seconds after `docker-compose --env-file backend/.env -f backend/docker-compose.yml up -d`
- Verify backend/.env credentials match backend/docker-compose.yml
- Restart postgres: `docker restart weather-postgres`

### "No data showing in charts"
1. Verify Airflow DAG executed successfully
   - Check Airflow UI at http://localhost:8080
2. Verify data in database:
   ```bash
   docker exec weather-postgres psql -U weather_user -d weather_dw \
     -c "SELECT COUNT(*) FROM fact_weather;"
   ```
3. Check backend API returns data:
   - http://localhost:8000/docs
   - Try `/api/temperature-trends` endpoint

### "CORS error" in browser console
- Backend CORS allows http://localhost:5173
- If using different port, update in `backend/main.py`

### "npm install fails"
```bash
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

---

## 📊 Project File Structure

```
DataEngineeringProject/
├── .gitignore                 # Git ignore rules
│
├── backend/
│   ├── docker-compose.yml     # Infrastructure as Code
│   ├── main.py                # FastAPI application
│   ├── requirements.txt       # Python dependencies
│   ├── Dockerfile             # Container image
│   ├── .env.example           # Backend env template (Docker + API)
│   ├── db/
│   │   ├── init.sql            # Star schema DDL
│   │   └── analysis_migration.sql
│   ├── airflow/
│   │   ├── Dockerfile.airflow
│   │   ├── entrypoint-airflow.sh
│   │   └── dags/
│   │       └── weather_etl_dag.py
│   ├── tests/
│   │   └── test_api.py
│   └── logs/
│       └── dag_id=weather_etl_pipeline/
│
├── frontend/
│   ├── package.json           # npm configuration
│   ├── vite.config.js         # Build configuration
│   ├── index.html             # HTML entry
│   ├── src/
│   │   ├── main.jsx           # React entry
│   │   └── components/
│   │       └── Dashboard.jsx  # Main component
│   └── README.md
│
└── README.md                  # Project documentation
```

---

## 🚀 Production Deployment

### Backend (Render.com)
1. Push code to GitHub
2. Create Render account: https://render.com
3. Create new Web Service
4. Connect GitHub repository
5. Set start command: `uvicorn main:app --host 0.0.0.0 --port 8000`
6. Add environment variables (database URL, etc.)
7. Deploy

See [backend/README.md](backend/README.md) for details.

### Frontend (Vercel)
1. Push code to GitHub
2. Create Vercel account: https://vercel.com
3. Import GitHub project
4. Configure environment: `VITE_API_BASE_URL=<your-backend-url>`
5. Deploy (automatic on each push)

See [frontend/README.md](frontend/README.md) for details.

---

## 📚 Documentation

- **Architecture**: See [README.md](README.md)
- **Backend API**: See [backend/README.md](backend/README.md)
- **Frontend**: See [frontend/README.md](frontend/README.md)
- **Database Schema**: See [backend/db/init.sql](backend/db/init.sql)
- **ETL Pipeline**: See [backend/airflow/dags/weather_etl_dag.py](backend/airflow/dags/weather_etl_dag.py)

---

## ❓ Common Questions

**Q: How often does the ETL run?**
A: Daily at 6:00 AM UTC by default. Configure in `backend/airflow/dags/weather_etl_dag.py` `schedule_interval` parameter.

**Q: Where does weather data come from?**
A: Open-Meteo API (free, no authentication required). See `backend/airflow/dags/weather_etl_dag.py` for more info.

**Q: Can I run this without Docker?**
A: Yes, but you must install PostgreSQL separately. Docker Compose is simpler.

**Q: How do I add new cities?**
A: Edit `CITY_COORDINATES` in `backend/airflow/dags/weather_etl_dag.py` and add city to the database.

**Q: How do I modify dashboard charts?**
A: Edit `frontend/src/components/Dashboard.jsx` and refresh the browser.

---

## 🎯 Next Steps

After the initial setup, you can:

1. **Customize ETL**
   - Change cities, date ranges, metrics in `backend/airflow/dags/weather_etl_dag.py`
   - Schedule frequency in `schedule_interval`

2. **Extend Dashboard**
   - Add more charts in `frontend/src/components/Dashboard.jsx`
   - Create new API endpoints in `backend/main.py`
   - Add new database views in `backend/db/init.sql`

3. **Deploy to Production**
   - Follow deployment guides in backend/README.md and frontend/README.md
   - Update database to managed service (AWS RDS, Google Cloud SQL)
   - Configure CI/CD pipeline (GitHub Actions, etc.)

---

## 📞 Support

For issues:
1. Check logs: `docker-compose --env-file backend/.env -f backend/docker-compose.yml logs`
2. Review README files
3. Check API docs: http://localhost:8000/docs
4. Search error message online

---

**Estimated Time: 15 minutes ⏱️**

Enjoy your data engineering project! 🎉

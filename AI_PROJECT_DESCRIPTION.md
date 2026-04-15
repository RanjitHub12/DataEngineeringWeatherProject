# 📊 WEATHER FORECAST ANALYTICAL DATA WAREHOUSE - COMPLETE PROJECT DESCRIPTION

**For: Sharing with Another AI Agent for Making Changes**

---

## 🎯 PROJECT OVERVIEW

**Name:** Weather Forecast Analytical Database  
**Purpose:** Complete data engineering pipeline for collecting, processing, and visualizing weather data  
**Status:** Fully functional with Docker containerization  
**Tech Stack:** Apache Airflow, PostgreSQL, FastAPI, React/Vite, Docker  
**Data Source:** Open-Meteo API (free, no authentication required)  
**Locations:** New York, London, Tokyo, New Delhi, Mumbai, Bengaluru, Chennai, Kolkata  

---

## 🏗️ ARCHITECTURE - COMPLETE FLOW

### **1. DATA INGESTION LAYER**
- **Source:** Open-Meteo API (https://open-meteo.com/)
- **Method:** HTTP requests using Python `requests` library
- **Frequency:** Daily at 6:00 AM UTC (configurable in Airflow DAG)
- **Data Points:** 
  - Temperature (average, min, max)
  - Humidity (daily max)
  - Precipitation
  - Wind speed (daily max)
  - Pressure (MSL)
  - Date (daily grain)
- **Cities:** Configurable via `WEATHER_CITIES` (defaults include New York, London, Tokyo, New Delhi, Mumbai, Bengaluru, Chennai, Kolkata)

### **2. PROCESSING LAYER**
- **Framework:** Apache Airflow DAGs (Directed Acyclic Graphs)
- **Location:** `backend/airflow/dags/weather_etl_dag.py`
- **Tasks:**
  1. **ingestion_task** → Fetch data from Open-Meteo API
  2. **processing_task** → Clean, validate, and transform using Pandas
  3. **storage_task** → Load into PostgreSQL star schema
- **Error Handling:** Retry logic with exponential backoff
- **Scheduling:** Daily execution, manually triggerable

### **3. STORAGE LAYER - STAR SCHEMA**
**Database:** PostgreSQL (`weather_dw`)
**Design Pattern:** Star Schema (dimensional modeling)

#### **Dimension Tables:**
1. **`dim_location`** (configurable city set)
  - `location_id` (PK)
  - `city_name` (e.g., New York, London, Tokyo, New Delhi)
  - `country`
  - `latitude`
  - `longitude`

2. **`dim_date`** (dynamic date range around current year)
  - `date_id` (PK)
  - `date_value`
  - `year`, `month`, `day`
  - `day_of_week`, `day_of_year`, `week_of_year`
  - `is_weekend`
  - `day_name`, `month_name`

#### **Fact Table:**
**`fact_weather`** (daily measurements)
- `weather_id` (PK)
- `location_id` (FK → dim_location)
- `date_id` (FK → dim_date)
- `temperature_avg`, `temperature_min`, `temperature_max`
- `humidity`
- `precipitation`
- `wind_speed_max`
- `pressure_hpa`
- `record_source`, `data_quality_flag`
- `created_at`, `updated_at`

#### **Pre-built SQL Views (for optimization):**
- `vw_temperature_trends_7day` - Last 7 days trends
- `vw_temperature_trends_rolling` - Rolling 7-day averages (window function)
- `vw_temperature_anomalies` - Temperature z-score by city
- `vw_weather_summary_by_location` - Aggregated stats by city
- `vw_monthly_weather_stats` - Monthly aggregations

### **4. ORCHESTRATION LAYER**
- **Tool:** Apache Airflow 2.7.3
- **UI:** Web dashboard on port 8080
- **Metadata DB:** PostgreSQL (`airflow_metadata`)
- **Executor:** LocalExecutor (background process)
- **DAG File:** `backend/airflow/dags/weather_etl_dag.py`
- **Retry Policy:** 3 retries with 5-minute intervals
- **Monitoring:** Built-in Airflow UI for task status

### **5. API LAYER - FASTAPI BACKEND**
**Framework:** FastAPI (Modern async Python web framework)  
**Port:** 8000

#### **Endpoints:**

1. **`GET /health`** - Health check
  - Returns: `{"status": "healthy"}`
   - Purpose: Load balancer health checks

2. **`GET /api/weather-summary`** - Aggregated weather by location
   - Returns:
   ```json
   {
     "status": "success",
     "data": [
       {
         "city_name": "New York",
         "record_count": 875,
         "max_temperature": 35.2,
         "min_temperature": -5.3,
         "avg_temperature": 15.8,
         "avg_humidity": 65.2,
         "total_precipitation": 342.5,
         "max_wind_speed": 45.2
       }
     ],
     "timestamp": "2026-04-14T13:30:00"
   }
   ```
   - Used by: Bar charts in frontend

3. **`GET /api/temperature-trends`** - 7-day temperature trends
   - Returns:
   ```json
   {
     "status": "success",
     "data": [
       {
         "city_name": "New York",
         "date_value": "2026-04-14",
         "temperature_avg": 18.5,
         "temperature_min": 12.3,
         "temperature_max": 24.7,
         "humidity": 68.5,
         "temperature_avg_7day": 17.9
       }
     ],
     "count": 21,
     "date_range": "2026-04-08 to 2026-04-14"
   }
   ```
   - Used by: Line charts in frontend

4. **`GET /docs`** - Swagger API documentation (auto-generated)

#### **Database Connection:**
- Uses SQLAlchemy ORM
- Connection string: `postgresql://{user}:{password}@{host}:{port}/{db}`
- Connection pooling: 5 connections, recycled every 1 hour
- CORS enabled for localhost:5173, localhost:3000

#### **Error Handling:**
- 500 errors are caught and logged
- Meaningful error messages returned to frontend
- Connection failures handled gracefully
- No data available returns 200 with empty array

### **6. FRONTEND LAYER - REACT DASHBOARD**
**Framework:** React 18 + Vite  
**Port:** 5173 (dev server)

#### **Components:**
- **Dashboard.jsx** - Main dashboard component
- **Charts:**
  - Line chart: Temperature trends over 7 days
  - Bar chart: Weather statistics by location
  - Uses Recharts library for visualization
- **API Integration:** Axios for HTTP requests
- **Styling:** Styled-components for CSS-in-JS

#### **Features:**
- Responsive design
- Real-time data fetching on component mount
- Loading states and error handling
- Tabbed, single-screen dashboard (KPIs, pipeline, analytics, summary, anomalies)
- City dropdown filters all charts and summary cards
- Condition label + icon update per city or mixed network view
- Interactive charts with hover tooltips

---

## 🗂️ COMPLETE FILE STRUCTURE

```
DataEngineeringProject/
│
├── README.md                          # Project overview
├── QUICKSTART.md                      # Quick start guide
├── QUICK_COMMANDS_REFERENCE.md        # Copy-paste commands
├── AI_PROJECT_DESCRIPTION.md          # This file
├── PROJECT_STATUS.md                  # Status summary
├── STARTUP_STATUS_REPORT.md           # Startup report
├── COMPLETE_STARTUP_SEQUENCE.md       # Full startup checklist
├── backend/
│   ├── docker-compose.yml            # Container orchestration
│   ├── Dockerfile                    # FastAPI backend image
│   ├── main.py                       # FastAPI application
│   ├── requirements.txt              # Python dependencies
│   ├── .env.example                  # Backend env template
│   ├── db/
│   │   ├── init.sql                  # Star schema initialization
│   │   └── analysis_migration.sql
│   ├── airflow/
│   │   ├── Dockerfile.airflow        # Airflow custom image
│   │   ├── entrypoint-airflow.sh
│   │   └── dags/
│   │       └── weather_etl_dag.py    # Main ETL pipeline
│   ├── tests/
│   │   └── test_api.py
│   └── README.md                     # Backend setup guide
│
├── frontend/
│   ├── public/
│   │   └── weather/                  # Weather icons (SVG)
│   ├── src/
│   │   ├── main.jsx                  # React entry point
│   │   └── components/
│   │       └── Dashboard.jsx         # Dashboard UI
│   ├── package.json                  # Dependencies & scripts
│   ├── vite.config.js                # Vite configuration
│   ├── .env.example                  # Frontend env template
│   ├── index.html                    # HTML entry point
│   └── README.md                     # Frontend setup guide
```

---

## 🐳 DOCKER SERVICES - COMPLETE SETUP

### **Service 1: PostgreSQL Data Warehouse**
- **Image:** `postgres:13-alpine`
- **Container:** `weather-postgres`
- **Port:** 5432 (external & internal)
- **Database:** `weather_dw`
- **User:** `weather_user`
- **Password:** `weather_secure_password_123!` (from .env)
- **Volumes:** `postgres_dw_data` (persistent)
- **Init Script:** `backend/db/init.sql` (runs on startup)
- **Health Check:** Every 10s (max 5s timeout)
- **Network:** `weather-network`

### **Service 2: PostgreSQL Airflow Metadata**
- **Image:** `postgres:13-alpine`
- **Container:** `weather-airflow-postgres`
- **Port:** 5433 (external maps to 5432 internal)
- **Database:** `airflow_metadata`
- **User:** `airflow_user`
- **Password:** `airflow_secure_password_456!` (from .env)
- **Volumes:** `postgres_airflow_data` (persistent)
- **Purpose:** Stores Airflow DAG history, task runs, connections
- **Network:** `weather-network`

### **Service 3: Apache Airflow Webserver**
- **Image:** Built from `Dockerfile.airflow`
- **Container:** `weather-airflow`
- **Port:** 8080 (external & internal)
- **Command:** `webserver`
- **Dependencies:** `weather-airflow-postgres` (must be healthy first)
- **Environment:**
  - `AIRFLOW__DATABASE__SQL_ALCHEMY_CONN`: Points to Airflow metadata DB
  - `AIRFLOW__CORE__EXECUTOR`: LocalExecutor
  - `AIRFLOW__WEBSERVER__DEFAULT_USER_USERNAME`: airflow
  - `AIRFLOW__WEBSERVER__DEFAULT_USER_PASSWORD`: airflow
- **Health Check:** Built-in Airflow health probe
- **Network:** `weather-network`
- **DAG Location:** `/opt/airflow/dags/`

### **Service 4: Apache Airflow Scheduler**
- **Image:** Built from `Dockerfile.airflow`
- **Container:** `weather-airflow-scheduler`
- **Command:** `scheduler`
- **Dependencies:** `weather-airflow-postgres`
- **Purpose:** Executes scheduled DAGs and tasks
- **Log Level:** INFO (configurable via env)
- **Network:** `weather-network`
- **Restart:** unless-stopped

### **Service 5: FastAPI Backend**
- **Image:** Built from `backend/Dockerfile`
- **Container:** `weather-backend`
- **Port:** 8000 (external & internal)
- **Command:** `python -m uvicorn main:app --host 0.0.0.0 --port 8000 --workers 2`
- **Environment:** Inherits from .env, connects to `weather-postgres`
- **Health Check:** Curl to /health every 30s
- **Network:** `weather-network`

### **Network:**
- **Name:** `weather-network` (bridge network)
- **Purpose:** Enables container-to-container communication
- **Services:** All 5 services connected

---

## 🔧 ENVIRONMENT VARIABLES - COMPLETE LIST

### **.env File (Root)**

```
# PostgreSQL Data Warehouse Configuration
POSTGRES_USER=weather_user
POSTGRES_PASSWORD=weather_secure_password_123!
POSTGRES_DB=weather_dw
POSTGRES_PORT=5432
POSTGRES_HOST=weather-postgres

# PostgreSQL Airflow Backend Configuration
AIRFLOW_POSTGRES_USER=airflow_user
AIRFLOW_POSTGRES_PASSWORD=airflow_secure_password_456!
AIRFLOW_POSTGRES_DB=airflow_metadata
AIRFLOW_POSTGRES_PORT=5433
AIRFLOW_POSTGRES_HOST=weather-airflow-postgres

# Apache Airflow Configuration
AIRFLOW_WEBSERVER_PORT=8080
AIRFLOW_SCHEDULER_LOG_LEVEL=INFO
AIRFLOW_WEBSERVER_LOG_LEVEL=INFO

# Airflow authentication
AIRFLOW__WEBSERVER__DEFAULT_USER_USERNAME=airflow
AIRFLOW__WEBSERVER__DEFAULT_USER_PASSWORD=airflow
AIRFLOW__CORE__LOAD_EXAMPLES=False

# Airflow email configuration (optional)
AIRFLOW__SMTP__SMTP_HOST=smtp.gmail.com
AIRFLOW__SMTP__SMTP_PORT=587
```

### **Key Environment Variables for Changes:**
- `POSTGRES_PASSWORD` - Change for production security
- `AIRFLOW_POSTGRES_PASSWORD` - Change for production security
- `AIRFLOW__WEBSERVER__DEFAULT_USER_PASSWORD` - Change Airflow UI login
- `POSTGRES_HOST` - Change when moving database
- `AIRFLOW_SCHEDULER_LOG_LEVEL` - Set to DEBUG for more verbose logs
- `WEATHER_CITIES` - Comma-separated city list for ETL ingestion

---

## 🔄 DATA FLOW - STEP BY STEP

1. **Airflow Scheduler** triggers DAG daily at 6 AM UTC
2. **Ingestion Task** fetches data from Open-Meteo API for configured cities
3. **Processing Task** cleans/validates/transforms data using Pandas
4. **Storage Task** inserts data into PostgreSQL star schema
5. **Backend API** queries PostgreSQL views
6. **Frontend** calls API endpoints on load and on manual refresh
7. **Dashboard** displays interactive charts with latest data

---

## 📋 DATABASE OPERATIONS

### **SQL Initialization (init.sql)**
- Creates dimension tables: `dim_location`, `dim_date`
- Creates fact table: `fact_weather`
- Creates indexes on foreign keys
- Creates materialized views for performance
- Inserts seed data (initial locations, date range around current year)

### **Queries Used:**
```sql
-- View temperature trends
SELECT * FROM vw_temperature_trends_7day;

-- View weather summary
SELECT * FROM vw_weather_summary_by_location;

-- Insert weather data
INSERT INTO fact_weather (...) VALUES (...);

-- Monthly aggregation
SELECT * FROM vw_monthly_weather_stats;
```

---

## 🔌 API INTEGRATION

### **Open-Meteo API Endpoints Used:**
```
https://archive-api.open-meteo.com/v1/archive?
  latitude={lat}
  &longitude={lng}
  &start_date={start}
  &end_date={end}
  &hourly=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m
  &timezone=UTC
```

### **Data Transformation:**
Raw API data → Pandas DataFrame → Validation → PostgreSQL insert → SQL Views → FastAPI Response → Frontend Charts

---

## 🛠️ MAKING CHANGES - KEY FILES TO MODIFY

| Change Type | File | Lines | Notes |
|------------|------|-------|-------|
| Add new endpoint | `backend/main.py` | 400+ | Follow Pydantic schema pattern |
| Change chart type | `frontend/src/components/Dashboard.jsx` | 200+ | Use Recharts components |
| Add new city | `backend/airflow/dags/weather_etl_dag.py` | 80-140 | Add to `CITY_COORDINATES` + `CITY_COUNTRIES`, then include in `WEATHER_CITIES` |
| Add new metric | `backend/db/init.sql` | 70-100 | Add column to `fact_weather` |
| Change schedule | `backend/airflow/dags/weather_etl_dag.py` | ~30 | Modify DAG `schedule_interval` |
| UI styling | `frontend/src/components/Dashboard.jsx` | 200+ | Styled-components definitions |
| Error handling | `backend/main.py` | 250-300 | Update exception handlers |
| Connection pool | `backend/main.py` | ~95 | Modify `engine.create_engine()` |

---

## 📦 DEPENDENCIES - WHAT'S INSTALLED

### **Backend (Python)**
```
fastapi==0.104.1
uvicorn[standard]==0.24.0
starlette==0.27.0
sqlalchemy==2.0.23
psycopg2-binary==2.9.9
pydantic==2.5.0
pydantic-settings==2.1.0
python-dotenv==1.0.0
python-multipart==0.0.6
```

### **DAG (Python)**
```
pandas==2.1.4
requests==2.31.0
sqlalchemy<2.0.0
psycopg2-binary==2.9.9
python-dotenv==1.0.0
pyarrow==14.0.1
```

### **Frontend (Node)**
```
react@^18.2.0
react-dom@^18.2.0
recharts@^2.10.3
axios@^1.6.2
styled-components@^6.1.0
```

### **Docker Images**
```
postgres:13-alpine (2 instances)
apache/airflow:2.7.3-python3.11
python:3.11-slim (backend build)
```

---

## 🚀 KNOWN ISSUES & SOLUTIONS

| Issue | Cause | Solution |
|-------|-------|----------|
| 500 error on temperature-trends | SQL INTERVAL syntax | ✅ FIXED: Changed `INTERVAL :days DAY` to `INTERVAL '7 days'` |
| Airflow doesn't start | DB not initialized | Run `airflow db init` or use entrypoint script |
| Frontend can't reach backend | CORS not enabled | Ensure `allowed_origins` includes frontend URL |
| No data in database | DAG not run | Trigger DAG manually in Airflow UI |
| Container port conflicts | Port already in use | Change ports in backend/docker-compose.yml or backend/.env |
| Python package conflicts | pip install issues | Use virtual environment or Docker |

---

## ✅ VERIFICATION COMMANDS

```powershell
# All containers running and healthy
docker ps

# View logs
docker-compose logs -f

# Test API
curl http://localhost:8000/health
curl http://localhost:8000/api/weather-summary

# Access services
# Frontend: http://localhost:5173
# Backend: http://localhost:8000
# Airflow: http://localhost:8080
# Swagger Docs: http://localhost:8000/docs

# Database
docker exec -it weather-postgres psql -U weather_user -d weather_dw
  SELECT * FROM dim_location;
  SELECT COUNT(*) FROM fact_weather;
```

---

## 📊 PERFORMANCE NOTES

- **Connection Pool:** 5 connections, recycled every 1 hour
- **Response Time:** <500ms for API endpoints
- **DAG Execution:** ~2-5 minutes for complete ETL
- **Database Size:** ~50-100MB with 1 year of daily data
- **Worker Processes:** 2 (configurable via backend CMD)

---

## 🔐 SECURITY CONSIDERATIONS

1. **Credentials:** All stored in .env (never commit)
2. **API Authentication:** Open-Meteo is free (no auth needed)
3. **Database Access:** Limited to Docker network
4. **CORS:** Restricted to localhost only
5. **Production:** Update passwords, add SSL, restrict origins

---

## 📈 DEPLOYMENT TARGETS

This project can be deployed to:
- **Render.com** - Built-in Docker support, PostgreSQL add-on
- **AWS** - ECS, RDS, ALB
- **Google Cloud** - Cloud Run, Cloud SQL
- **Azure** - Container Instances, Database for PostgreSQL
- **DigitalOcean** - App Platform, Managed Database

---

## 🎓 LEARNING OUTCOMES

This project demonstrates:
- ✅ Modern data engineering pipeline architecture
- ✅ ETL/ELT using Apache Airflow
- ✅ Database design (star schema)
- ✅ REST API development (FastAPI)
- ✅ Frontend integration (React)
- ✅ Container orchestration (Docker Compose)
- ✅ Data visualization (Recharts)
- ✅ Production-ready code patterns

---

**End of Project Description**

*Created: April 14, 2026*  
*For: Sharing with AI agents for making modifications*  
*Status: Complete and tested locally*

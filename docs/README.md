# Weather Forecast Analytical DB

End-to-end data engineering pipeline for ingesting weather data, storing it in a PostgreSQL warehouse, and visualizing it in a React dashboard.

## Architecture
- Ingestion: Open-Meteo API
- Processing: Airflow DAG (Pandas transforms)
- Storage: PostgreSQL star schema
- Analytics: SQL views and analysis tables
- API: FastAPI
- UI: React + Vite + Recharts

## Quickstart (Docker)

### 1) Configure environment
```powershell
Copy-Item backend/.env.example backend/.env
```

### 2) Start the stack
```powershell
docker compose --env-file backend/.env -f backend/docker-compose.yml up -d --build
```

### 3) (Optional) Initialize or reset the warehouse
```powershell
docker exec weather-postgres psql -U weather_user -d weather_dw -f /docker-entrypoint-initdb.d/init.sql
```
Note: The Postgres container runs `init.sql` automatically on first startup with a fresh volume.
Running this command later will drop and recreate tables (data reset).

### 4) Open the UIs
- Airflow: http://localhost:8080 (airflow / airflow)
- API docs: http://localhost:8000/docs
- Dashboard: http://localhost:5173

## Local Development (no backend container)

### Backend
```powershell
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
Copy-Item .env.example .env
python main.py
```

Use these values in backend/.env when running locally:
- POSTGRES_HOST=127.0.0.1
- POSTGRES_PORT=5434

### Frontend
```powershell
cd frontend
npm install
Copy-Item .env.example .env.local
npm run dev
```

Set VITE_API_BASE_URL in frontend/.env.local if your API is not http://localhost:8000.

## Default Ports
- FastAPI API: 8000
- Airflow UI: 8080
- PostgreSQL (data warehouse): 5434
- PostgreSQL (Airflow metadata): 5433
- React dev server: 5173

## API Endpoints
- GET /health
- GET /api/temperature-trends
- GET /api/weather-summary
- GET /api/temperature-anomalies

## Configuration Notes
- Default cities are controlled by WEATHER_CITIES in backend/.env
- The ETL runs daily at 06:00 UTC in backend/airflow/dags/weather_etl_dag.py

## Component Docs
- Backend: docs/backend/README.md
- Frontend: docs/frontend/README.md
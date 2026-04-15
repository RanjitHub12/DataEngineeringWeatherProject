# 📊 Weather Forecast Analytical DB - Project Status

**Date**: April 16, 2026
**Status**: Validated locally (API-driven data)

---

## ✅ Expected Services (Local)

| Service | URL | Port | Expected Status | Purpose |
|---------|-----|------|-----------------|---------|
| **React Frontend** | http://localhost:5173 | 5173 | ✅ Verified | Dashboard UI |
| **FastAPI Backend** | http://localhost:8000 | 8000 | ✅ Verified | REST API |
| **API Docs** | http://localhost:8000/docs | 8000 | ✅ Verified | Swagger UI |
| **Apache Airflow** | http://localhost:8080 | 8080 | ✅ Verified | ETL Orchestration |
| **PostgreSQL (Data)** | localhost:5434 | 5434 | ✅ Verified | Data Warehouse |
| **PostgreSQL (Airflow)** | localhost:5433 | 5433 | ✅ Verified | Airflow Metadata |

---

## ✅ Recent Updates

- Advanced SQL window functions now power rolling averages in temperature trends.
- Airflow ETL inserts missing dates dynamically and uses `ON CONFLICT` upserts.
- Warehouse views include rolling trend and anomaly analytics.
- Dashboard UI upgraded with tabbed, single-screen panels, city filtering, and refined styling.
- Sample data scripts removed; fact data is API-only.
- India city set added to ETL defaults (New Delhi, Mumbai, Bengaluru, Chennai, Kolkata).

---

## 🧪 Validation Checklist

1. `docker-compose --env-file backend/.env -f backend/docker-compose.yml up -d`
2. Trigger Airflow DAG: `weather_etl_pipeline`
3. Run API tests: `python backend/tests/test_api.py`
4. Open frontend: http://localhost:5173
5. Confirm charts show data and refresh without errors

---

## 📊 Database Notes

- `dim_date` is now seeded dynamically around the current year and extended during ETL runs.
- Fact inserts use `ON CONFLICT (location_id, date_id)` to avoid duplicate load failures.
- New analytical views: `vw_temperature_trends_rolling`, `vw_temperature_anomalies`.
- Latest API load: 24 rows for 2026-04-07 to 2026-04-14.

---

## 🔧 Config Reminder (from backend/.env.example)

```env
POSTGRES_HOST=127.0.0.1
POSTGRES_PORT=5434
POSTGRES_USER=weather_user
POSTGRES_PASSWORD=password123
POSTGRES_DB=weather_dw

AIRFLOW_POSTGRES_PORT=5433
AIRFLOW_POSTGRES_USER=airflow_user
AIRFLOW_POSTGRES_PASSWORD=airflow_secure_password_456!
```

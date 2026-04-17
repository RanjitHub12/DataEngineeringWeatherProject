# FastAPI Backend - Weather Forecast Dashboard

## Overview

This is the backend API for the Weather Forecast Analytical DB project. It provides RESTful endpoints to query aggregated weather data from PostgreSQL and serve it to the React frontend.

## Endpoints

### 1. GET /api/temperature-trends
**Purpose**: Fetch 7-day temperature trend data for line chart visualization

**Query Parameters**:
- `days` (optional, default=7): Number of days to retrieve (1-365)

**Response**:
```json
{
  "status": "success",
  "data": [
    {
      "city_name": "New York",
      "date_value": "2024-01-15",
      "temperature_avg": 5.2,
      "temperature_min": 2.1,
      "temperature_max": 8.5,
      "humidity": 65.0,
      "temperature_avg_7day": 6.1
    }
  ],
  "count": 21,
  "date_range": "2024-01-09 to 2024-01-15"
}
```

### 2. GET /api/weather-summary
**Purpose**: Fetch aggregated weather statistics grouped by location for bar chart

**Response**:
```json
{
  "status": "success",
  "data": [
    {
      "city_name": "New York",
      "record_count": 365,
      "max_temperature": 28.5,
      "min_temperature": -5.2,
      "avg_temperature": 12.3,
      "avg_humidity": 62.5,
      "total_precipitation": 1250.0,
      "max_wind_speed": 45.0
    }
  ],
  "timestamp": "2024-01-15T10:30:00"
}
```

### 3. GET /api/temperature-anomalies
**Purpose**: Fetch rolling averages and temperature anomaly signals

**Notes**:
- This endpoint reads from `fact_weather_analysis`, which is populated by the Airflow analysis task.
- If the table is empty or missing, the API returns a warning with an empty data array.

**Query Parameters**:
- `days` (optional, default=30): Number of days to retrieve (1-365)

**Response**:
```json
{
   "status": "success",
   "data": [
      {
         "city_name": "New York",
         "date_value": "2024-01-15",
         "temperature_avg": 5.2,
         "temperature_avg_7day": 4.9,
         "temperature_zscore": 1.3,
         "precipitation_7day": 12.5
      }
   ],
   "count": 30,
   "date_range": "2024-01-09 to 2024-02-07"
}
```

### 4. GET /health
**Purpose**: Health check endpoint for monitoring

**Response**:
```json
{
  "status": "healthy",
  "service": "Weather Forecast Dashboard API",
  "timestamp": "2024-01-15T10:30:00"
}
```

## Local Development

### Prerequisites
- Python 3.9+
- PostgreSQL running (via Docker Compose)
- Virtual environment tool (virtualenv or conda)

### Setup Steps

1. **Create Virtual Environment**
   ```bash
   # Using venv
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. **Install Dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Configure Environment**
   ```bash
   cp .env.example .env
   # ⚠️ IMPORTANT: For LOCAL development, ensure POSTGRES_HOST=localhost in .env
   #    (Default is localhost, but if you copied from main .env, change weather-postgres → localhost)
   ```
   
   **Key Configuration Notes:**
   - `POSTGRES_HOST=localhost` (for running backend locally on your machine)
   - `POSTGRES_HOST=weather-postgres` (only when backend runs in Docker container)
   - `POSTGRES_PORT=5434` (default host port from backend/.env.example)
   - All other credentials should match your backend/docker-compose.yml setup

4. **Run Server**
   ```bash
   python main.py
   # Or with auto-reload:
   uvicorn main:app --reload
   ```

5. **Access API**
   - API Documentation (Swagger UI): http://localhost:8000/docs
   - API Documentation (ReDoc): http://localhost:8000/redoc
   - Health Check: http://localhost:8000/health
   - Temperature Trends: http://localhost:8000/api/temperature-trends
   - Weather Summary: http://localhost:8000/api/weather-summary
   - Temperature Anomalies: http://localhost:8000/api/temperature-anomalies

## Docker Development

### Build Image
```bash
docker build -t weather-backend .
```

### Run Container
```bash
docker run \
  -p 8000:8000 \
  --env-file .env \
  --network weather-network \
  weather-backend
```

## Production Deployment

### Deployment on Render.com (Recommended)

1. **Create Render Account**
   - Sign up at https://render.com
   - Connect your GitHub repository

2. **Create Web Service**
   - Choose "Docker" as the environment
   - Set the build command: `docker build -t weather-backend .`
   - Set the start command: `uvicorn main:app --host 0.0.0.0 --port 8000`

3. **Configure Environment Variables**
   - In Render dashboard, add environment variables:
     ```
     POSTGRES_HOST=your-external-db-host
     POSTGRES_PORT=5432
     POSTGRES_DB=weather_dw
     POSTGRES_USER=weather_user
     POSTGRES_PASSWORD=your-secure-password
     ```

4. **Deploy**
   - Push to main branch on GitHub
   - Render automatically deploys the new build

### Deployment on AWS (Alternative)

1. **Using Elastic Container Service (ECS)**
   ```bash
   # Create ECR repository
   aws ecr create-repository --repository-name weather-backend
   
   # Build and push image
   docker build -t weather-backend .
   docker tag weather-backend:latest [ACCOUNT_ID].dkr.ecr.[REGION].amazonaws.com/weather-backend:latest
   docker push [ACCOUNT_ID].dkr.ecr.[REGION].amazonaws.com/weather-backend:latest
   ```

2. **Create ECS Task Definition** with:
   - Image: Your ECR image URL
   - Port: 8000
   - Environment variables from AWS Secrets Manager

3. **Create ECS Service** to run the task

### Deployment on Google Cloud Run

1. **Build Image**
   ```bash
   gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/weather-backend
   ```

2. **Deploy Service**
   ```bash
   gcloud run deploy weather-backend \
     --image gcr.io/YOUR_PROJECT_ID/weather-backend \
     --platform managed \
     --region us-central1 \
     --set-env-vars POSTGRES_HOST=your-db-host
   ```

## Database Connection

The backend connects to PostgreSQL using SQLAlchemy with the following URL format:
```
postgresql://username:password@host:port/database
```

**Security Notes**:
- Credentials MUST be loaded from `.env` file
- Never hardcode credentials in source code
- Use parameterized queries to prevent SQL injection (SQLAlchemy handles this)
- In production, use AWS RDS, Google Cloud SQL, or managed PostgreSQL service

## Architecture

### Connection Flow
1. FastAPI application starts
2. SQLAlchemy engine created at startup
3. Session factory configured for request handling
4. Each endpoint gets a fresh database session via dependency injection
5. Session automatically closed after request completes

### Query Optimization
- Temperature trends use a direct SQL query with window functions
- Weather summary uses the `vw_weather_summary_by_location` view
- Anomalies are read from `fact_weather_analysis`
- Indexes on dimensional tables for fast joins

## Monitoring & Logging

The application logs important events:
- Database connection status
- Query execution
- Errors and exceptions
- Request/response timing

View logs:
```bash
# In Docker
docker logs <container_id>

# In Render
- Navigate to service dashboard
- Click "Logs" tab
```

## API Documentation

### Swagger UI (Interactive)
Navigate to: `http://localhost:8000/docs`
- Try out endpoints directly
- See request/response examples
- Auto-generated from code

### ReDoc (Reference)
Navigate to: `http://localhost:8000/redoc`
- Read-only documentation
- Clean, organized view

## Troubleshooting

### Connection Error: "Connect to PostgreSQL failed"
- Verify PostgreSQL container is running: `docker ps | grep postgres`
- Check credentials in .env match docker-compose.yml
- Verify network connectivity: `docker network ls`

### Error: "Cannot import modules"
- Reinstall dependencies: `pip install --upgrade -r requirements.txt`
- Verify Python version: `python --version` (need 3.9+)

### API returns empty data
- Verify Airflow ETL has run and loaded data
- Check database directly: `psql -U weather_user -d weather_dw`
- Query: `SELECT COUNT(*) FROM fact_weather;`

### CORS errors in browser console
- Check frontend URL matches CORS configuration in main.py
- CORS origins are currently defined in `allowed_origins` inside `main.py`
- Frontend must send requests from an allowed origin

## Technology Stack

- **Framework**: FastAPI 0.104+
- **Server**: Uvicorn
- **ORM**: SQLAlchemy 2.0+
- **Database Driver**: psycopg2-binary
- **Data Validation**: Pydantic 2.0+
- **Python**: 3.9+

## Contributing

When modifying the API:
1. Update endpoint documentation in docstring
2. Add/update Pydantic models for new response schemas
3. Use dependency injection for database sessions
4. Include error handling and logging
5. Test with `http://localhost:8000/docs`

## License

Academic Project - 2024

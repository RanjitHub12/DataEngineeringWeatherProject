"""
============================================================================
FASTAPI: Weather Forecast Dashboard Backend
============================================================================
Purpose:
    RESTful API backend for the Weather Forecast dashboard.
    Provides two endpoints to serve aggregated weather data for visualization.

Tech Stack:
    - FastAPI: Modern async Python web framework
    - SQLAlchemy: ORM for database queries
    - PostgreSQL: Data source (queried via views)
    - Pydantic: Data validation and serialization

Endpoints:
    1. GET /api/temperature-trends
       Returns 7-day temperature trend data for all locations
       Used by: Line chart component in frontend
    
    2. GET /api/weather-summary
       Returns aggregated weather statistics grouped by location
       Used by: Bar chart component in frontend

Database Connection:
    - All credentials loaded from .env via environment variables
    - Uses SQLAlchemy for secure parameterized queries
    - Pre-built views (vw_temperature_trends_7day, vw_weather_summary_by_location)
      provide optimized queries

CORS Policy:
    - Allows requests from http://localhost:5173 (Vite dev server)
    - Allows requests from frontend domain in production
    - Prevents unauthorized cross-origin requests

Error Handling:
    - 500 errors caught and logged
    - Meaningful error messages returned to frontend
    - Connection failures handled gracefully

Author: Data Engineering Team
Version: 1.0.0
"""

import logging
import os
from contextlib import asynccontextmanager
from typing import List, Dict, Any

# ============================================================================
# IMPORTS: FastAPI Framework
# ============================================================================
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

# ============================================================================
# IMPORTS: Database & ORM
# ============================================================================
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.exc import SQLAlchemyError
from dotenv import load_dotenv

# ============================================================================
# IMPORTS: Data Validation & Serialization
# ============================================================================
from pydantic import BaseModel
from datetime import datetime, date

# ============================================================================
# CONFIGURATION: Load Environment Variables
# ============================================================================
# All credentials MUST be loaded from .env file
load_dotenv()

# ============================================================================
# LOGGING CONFIGURATION
# ============================================================================
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# ============================================================================
# DATABASE CONFIGURATION
# ============================================================================
# Load PostgreSQL credentials from environment variables
# 
# NOTE ON POSTGRES_HOST:
#   - Local development (running backend on Windows): Use "localhost" or "127.0.0.1"
#   - Docker deployment (backend in container): Use "weather-postgres" (container name)
#   - See .env.example for guidance on which to use

DB_USER = os.getenv('POSTGRES_USER', 'weather_user')
DB_PASSWORD = os.getenv('POSTGRES_PASSWORD', 'weather_secure_password_123!')
DB_HOST = os.getenv('POSTGRES_HOST', 'localhost')
DB_PORT = os.getenv('POSTGRES_PORT', '5432')
DB_NAME = os.getenv('POSTGRES_DB', 'weather_dw')

# Construct database URL for SQLAlchemy
DATABASE_URL = f'postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}'

logger.info(f"Connecting to database: {DB_HOST}:{DB_PORT}/{DB_NAME}")

# Create SQLAlchemy engine
# Parameters:
#   - echo=False: Disable logging of SQL queries (set to True for debugging)
#   - pool_size=5: Connection pool size
#   - pool_recycle=3600: Recycle connections after 1 hour
engine = create_engine(
    DATABASE_URL,
    echo=False,
    pool_size=5,
    pool_recycle=3600,
    pool_pre_ping=True  # Verify connections before using
)

# Create session factory
SessionLocal = sessionmaker(
    bind=engine,
    autocommit=False,
    autoflush=False
)


# ============================================================================
# DEPENDENCY INJECTION: Database Session
# ============================================================================
# This function provides a database session to routes
# FastAPI automatically calls it and injects the session

def get_db() -> Session:
    """
    Dependency function to provide a database session.
    
    Yields a database session that is automatically closed after the route completes.
    This ensures proper resource cleanup and transaction management.
    
    Usage in routes:
        @app.get("/endpoint")
        async def route_handler(db: Session = Depends(get_db)):
            # Use db session here
    
    Yields:
        Session: SQLAlchemy session object
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ============================================================================
# STARTUP & SHUTDOWN EVENTS
# ============================================================================
# These run when the application starts/stops

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan context manager for FastAPI application.
    
    Startup: Verify database connection on application start
    Shutdown: Clean up resources when application stops
    """
    # STARTUP
    logger.info("🚀 Starting Weather Forecast Dashboard Backend...")
    try:
        # Test database connection
        with engine.connect() as conn:
            result = conn.execute(text("SELECT 1"))
            logger.info("✓ Database connection verified")
    except Exception as e:
        logger.error(f"✗ Failed to connect to database: {str(e)}")
        raise
    
    yield  # Application runs here
    
    # SHUTDOWN
    logger.info("🛑 Shutting down Weather Forecast Dashboard Backend...")
    engine.dispose()
    logger.info("✓ Database connections closed")


# ============================================================================
# FASTAPI APPLICATION INITIALIZATION
# ============================================================================

app = FastAPI(
    title="Weather Forecast Dashboard API",
    description="API for weather data visualization",
    version="1.0.0",
    lifespan=lifespan,
)


# ============================================================================
# CORS MIDDLEWARE: Cross-Origin Resource Sharing
# ============================================================================
# Allow frontend to make requests to this backend from different origin

allowed_origins = [
    "http://localhost:5173",      # Vite dev server (local development)
    "http://localhost:3000",      # Alternative local port
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000",
    # In production, add your Vercel frontend URL:
    # "https://your-frontend.vercel.app",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],  # Allow all HTTP methods
    allow_headers=["*"],  # Allow all headers
)

logger.info(f"✓ CORS configured for origins: {allowed_origins}")


# ============================================================================
# PYDANTIC MODELS: Response Schema
# ============================================================================
# Data validation and documentation for API responses

class TemperatureTrendItem(BaseModel):
    """Response model for a single data point in temperature trends"""
    city_name: str
    date_value: date
    temperature_avg: float
    temperature_min: float
    temperature_max: float
    humidity: float
    temperature_avg_7day: float
    
    class Config:
        from_attributes = True  # Support ORM model conversion


class TemperatureTrend(BaseModel):
    """Response model for temperature trends endpoint"""
    status: str
    data: List[TemperatureTrendItem]
    count: int
    date_range: str


class WeatherSummaryItem(BaseModel):
    """Response model for a single location in weather summary"""
    city_name: str
    record_count: int
    max_temperature: float
    min_temperature: float
    avg_temperature: float
    avg_humidity: float
    total_precipitation: float
    max_wind_speed: float
    
    class Config:
        from_attributes = True


class WeatherSummary(BaseModel):
    """Response model for weather summary endpoint"""
    status: str
    data: List[WeatherSummaryItem]
    timestamp: datetime


class TemperatureAnomalyItem(BaseModel):
    """Response model for a single anomaly data point"""
    city_name: str
    date_value: date
    temperature_avg: float
    temperature_avg_7day: float
    temperature_zscore: float
    precipitation_7day: float

    class Config:
        from_attributes = True


class TemperatureAnomalyResponse(BaseModel):
    """Response model for anomaly analysis endpoint"""
    status: str
    data: List[TemperatureAnomalyItem]
    count: int
    date_range: str


# ============================================================================
# ROUTE: Health Check
# ============================================================================
# Used for monitoring and load balancer health checks

@app.get("/health")
async def health_check():
    """
    Health check endpoint.
    
    Returns 200 OK if the API is running and database is accessible.
    Used for monitoring and Kubernetes liveness probes.
    
    Returns:
        dict: Status information
    """
    return {
        "status": "healthy",
        "service": "Weather Forecast Dashboard API",
        "timestamp": datetime.utcnow().isoformat()
    }


# ============================================================================
# ROUTE 1: GET /api/temperature-trends
# ============================================================================
# 7-day temperature trend data for line chart visualization

@app.get("/api/temperature-trends", response_model=TemperatureTrend)
async def get_temperature_trends(
    days: int = 7,
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Fetch temperature trends for the last N days.
    
    This endpoint queries the vw_temperature_trends_7day view which:
        - Returns data from the last 7 days by default
        - Includes min, max, and average temperatures
        - Groups by city and date
        - Sorted chronologically
    
    Data Flow:
        1. Request arrives with optional 'days' parameter
        2. Query vw_temperature_trends_7day from PostgreSQL
        3. Parse results into Pydantic model
        4. Return JSON to frontend
        5. Frontend uses this for Line Chart component
    
    Args:
        days: Number of days to fetch (default: 7)
        db: Database session (injected by FastAPI)
    
    Returns:
        TemperatureTrend: Structured response with temperature data
    
    Raises:
        HTTPException: If database query fails
        
    Example Response:
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
                },
                ...
            ],
            "count": 21,
            "date_range": "2024-01-09 to 2024-01-15"
        }
    
    Frontend Usage:
        const response = await axios.get('/api/temperature-trends');
        const data = response.data.data;  // Array of trend items
        // Pass to Recharts LineChart component
    """
    
    if days < 1 or days > 365:
        raise HTTPException(
            status_code=400,
            detail="days must be between 1 and 365"
        )

    try:
        logger.info(f"🔍 Query: Temperature trends (last {days} days)")
        
        # ====================================================================
        # SQL QUERY: Fetch temperature trends with rolling average
        # ====================================================================
        # Uses window functions for a 7-day rolling average per city
        
        query = text("""
            WITH base AS (
                SELECT 
                    dl.city_name,
                    dd.date_value,
                    fw.temperature_avg,
                    fw.temperature_min,
                    fw.temperature_max,
                    fw.humidity,
                    AVG(fw.temperature_avg) OVER (
                        PARTITION BY dl.city_name
                        ORDER BY dd.date_value
                        ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
                    ) AS temperature_avg_7day
                FROM fact_weather fw
                INNER JOIN dim_location dl ON fw.location_id = dl.location_id
                INNER JOIN dim_date dd ON fw.date_id = dd.date_id
                WHERE dd.date_value >= CURRENT_DATE - make_interval(days => :days)
            )
            SELECT 
                city_name,
                date_value,
                temperature_avg,
                temperature_min,
                temperature_max,
                humidity,
                temperature_avg_7day
            FROM base
            ORDER BY city_name, date_value ASC
        """)
        
        result = db.execute(query, {"days": days})
        rows = result.fetchall()
        
        logger.info(f"✓ Retrieved {len(rows)} records")
        
        # ====================================================================
        # RESPONSE CONSTRUCTION
        # ====================================================================
        
        if not rows:
            logger.warning("No temperature trend data found in database")
            return {
                "status": "warning",
                "data": [],
                "count": 0,
                "date_range": "No data available"
            }
        
        # Convert database rows to dictionaries
        trend_data = [
            {
                "city_name": row[0],
                "date_value": row[1],
                "temperature_avg": float(row[2]) if row[2] is not None else 0.0,
                "temperature_min": float(row[3]) if row[3] is not None else 0.0,
                "temperature_max": float(row[4]) if row[4] is not None else 0.0,
                "humidity": float(row[5]) if row[5] is not None else 0.0,
                "temperature_avg_7day": float(row[6]) if row[6] is not None else 0.0,
            }
            for row in rows
        ]
        
        # Calculate date range for response
        dates = [item["date_value"] for item in trend_data]
        date_range = f"{min(dates)} to {max(dates)}"
        
        return {
            "status": "success",
            "data": trend_data,
            "count": len(trend_data),
            "date_range": date_range
        }
    
    except SQLAlchemyError as e:
        logger.error(f"✗ Database error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Database query failed"
        )
    except Exception as e:
        logger.error(f"✗ Unexpected error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Internal server error"
        )


# ============================================================================
# ROUTE 2: GET /api/weather-summary
# ============================================================================
# Aggregated weather statistics grouped by location (bar chart data)

@app.get("/api/weather-summary", response_model=WeatherSummary)
async def get_weather_summary(
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Fetch aggregated weather summary for all locations.
    
    This endpoint queries the vw_weather_summary_by_location view which:
        - Aggregates all available weather data
        - Groups by location/city
        - Calculates: max/min/avg temperatures, humidity, precipitation, wind
        - Used for high-level dashboard overview
    
    Data Flow:
        1. Query vw_weather_summary_by_location from PostgreSQL
        2. Aggregate historical data across all dates per city
        3. Return JSON to frontend
        4. Frontend uses this for Bar Chart component
    
    Args:
        db: Database session (injected by FastAPI)
    
    Returns:
        WeatherSummary: Aggregated statistics for each location
    
    Raises:
        HTTPException: If database query fails
        
    Example Response:
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
                },
                ...
            ],
            "timestamp": "2024-01-15T10:30:00"
        }
    
    Frontend Usage:
        const response = await axios.get('/api/weather-summary');
        const data = response.data.data;  // Array of city summaries
        // Pass to Recharts BarChart component for comparison
    """
    
    try:
        logger.info("🔍 Query: Weather summary by location")
        
        # ====================================================================
        # SQL QUERY: Fetch aggregated weather statistics
        # ====================================================================
        # This view aggregates across all available historical data
        
        query = text("""
            SELECT 
                city_name,
                record_count,
                max_temperature,
                min_temperature,
                avg_temperature,
                avg_humidity,
                total_precipitation,
                max_wind_speed
            FROM vw_weather_summary_by_location
            ORDER BY city_name ASC
        """)
        
        # Execute query
        result = db.execute(query)
        rows = result.fetchall()
        
        logger.info(f"✓ Retrieved {len(rows)} location summaries")
        
        # ====================================================================
        # RESPONSE CONSTRUCTION
        # ====================================================================
        
        if not rows:
            logger.warning("No weather summary data found in database")
            return {
                "status": "warning",
                "data": [],
                "timestamp": datetime.utcnow().isoformat()
            }
        
        # Convert database rows to dictionaries
        summary_data = [
            {
                "city_name": row[0],
                "record_count": int(row[1]) if row[1] is not None else 0,
                "max_temperature": float(row[2]) if row[2] is not None else 0.0,
                "min_temperature": float(row[3]) if row[3] is not None else 0.0,
                "avg_temperature": float(row[4]) if row[4] is not None else 0.0,
                "avg_humidity": float(row[5]) if row[5] is not None else 0.0,
                "total_precipitation": float(row[6]) if row[6] is not None else 0.0,
                "max_wind_speed": float(row[7]) if row[7] is not None else 0.0,
            }
            for row in rows
        ]
        
        return {
            "status": "success",
            "data": summary_data,
            "timestamp": datetime.utcnow().isoformat()
        }
    
    except SQLAlchemyError as e:
        logger.error(f"✗ Database error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Database query failed"
        )
    except Exception as e:
        logger.error(f"✗ Unexpected error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Internal server error"
        )


# ============================================================================
# ROUTE 3: GET /api/temperature-anomalies
# ============================================================================
# Anomaly scores (z-score) and rolling averages from analysis table

@app.get("/api/temperature-anomalies", response_model=TemperatureAnomalyResponse)
async def get_temperature_anomalies(
    days: int = 30,
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Fetch temperature anomaly signals for the last N days.

    This endpoint queries fact_weather_analysis, returning:
        - rolling 7-day averages
        - temperature z-score anomalies
        - rolling 7-day precipitation totals
    """

    if days < 1 or days > 365:
        raise HTTPException(
            status_code=400,
            detail="days must be between 1 and 365"
        )

    try:
        logger.info(f"🔍 Query: Temperature anomalies (last {days} days)")

        table_exists = db.execute(
            text("SELECT to_regclass('public.fact_weather_analysis')")
        ).scalar()
        if table_exists is None:
            logger.warning("fact_weather_analysis table not found")
            return {
                "status": "warning",
                "data": [],
                "count": 0,
                "date_range": "No data available"
            }

        query = text("""
            SELECT
                dl.city_name,
                dd.date_value,
                fwa.temperature_avg,
                fwa.temperature_avg_7day,
                fwa.temperature_zscore,
                fwa.precipitation_7day
            FROM fact_weather_analysis fwa
            INNER JOIN dim_location dl ON fwa.location_id = dl.location_id
            INNER JOIN dim_date dd ON fwa.date_id = dd.date_id
            WHERE dd.date_value >= CURRENT_DATE - make_interval(days => :days)
            ORDER BY dl.city_name, dd.date_value ASC
        """)

        result = db.execute(query, {"days": days})
        rows = result.fetchall()

        logger.info(f"✓ Retrieved {len(rows)} anomaly records")

        if not rows:
            logger.warning("No anomaly data found in database")
            return {
                "status": "warning",
                "data": [],
                "count": 0,
                "date_range": "No data available"
            }

        anomaly_data = [
            {
                "city_name": row[0],
                "date_value": row[1],
                "temperature_avg": float(row[2]) if row[2] is not None else 0.0,
                "temperature_avg_7day": float(row[3]) if row[3] is not None else 0.0,
                "temperature_zscore": float(row[4]) if row[4] is not None else 0.0,
                "precipitation_7day": float(row[5]) if row[5] is not None else 0.0,
            }
            for row in rows
        ]

        dates = [item["date_value"] for item in anomaly_data]
        date_range = f"{min(dates)} to {max(dates)}"

        return {
            "status": "success",
            "data": anomaly_data,
            "count": len(anomaly_data),
            "date_range": date_range
        }

    except SQLAlchemyError as e:
        logger.error(f"✗ Database error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Database query failed"
        )
    except Exception as e:
        logger.error(f"✗ Unexpected error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Internal server error"
        )


# ============================================================================
# ROOT ROUTE: API Documentation
# ============================================================================

@app.get("/")
async def root():
    """Root endpoint - redirects to API documentation"""
    return {
        "message": "Weather Forecast Dashboard API",
        "version": "1.0.0",
        "docs": "/docs",
        "endpoints": {
            "health": "/health",
            "temperature_trends": "/api/temperature-trends",
            "weather_summary": "/api/weather-summary",
            "temperature_anomalies": "/api/temperature-anomalies"
        }
    }


# ============================================================================
# EXCEPTION HANDLERS
# ============================================================================
# Custom error handling for better error messages

@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    """Handle HTTP exceptions with logging"""
    logger.error(f"HTTP Exception: {exc.detail}")
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": exc.detail}
    )


# ============================================================================
# APPLICATION ENTRY POINT
# ============================================================================

if __name__ == "__main__":
    import uvicorn
    
    # Configuration
    HOST = os.getenv('BACKEND_HOST', '0.0.0.0')
    PORT = int(os.getenv('BACKEND_PORT', 8000))
    ENV = os.getenv('BACKEND_ENV', 'development')
    
    logger.info(f"Starting server on {HOST}:{PORT} (Environment: {ENV})")
    
    # Run uvicorn server
    # Note: Pass app as import string "main:app" (not app object) to enable reload
    uvicorn.run(
        "main:app",
        host=HOST,
        port=PORT,
        log_level="info",
        reload=(ENV == 'development')  # Auto-reload in development
    )

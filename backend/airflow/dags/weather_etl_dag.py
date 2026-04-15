"""
============================================================================
AIRFLOW DAG: Weather ETL Pipeline
============================================================================
Purpose: 
    Orchestrate the complete ETL workflow for weather data:
    1. Ingestion: Fetch data from Open-Meteo API for 3 cities
    2. Processing: Clean, validate, and transform using Pandas
    3. Storage: Load processed data into PostgreSQL star schema

Schedule: Runs daily at 6:00 AM UTC
Author: Data Engineering Team
Version: 1.0.0

Dependencies:
    - pandas, requests, sqlalchemy, psycopg2 (in Dockerfile.airflow)
    - PostgreSQL databases (weather_dw, airflow_metadata)
    - Environment variables (POSTGRES_USER, POSTGRES_PASSWORD, etc.)

Architecture:
    ingestion_task → processing_task → storage_task
    
    Each task is independent and can fail/retry without affecting others.
"""

import os
from datetime import datetime, timedelta
import logging

# ============================================================================
# IMPORTS: Airflow & Core Libraries
# ============================================================================
from airflow import DAG
from airflow.operators.python import PythonOperator
from airflow.operators.bash import BashOperator
from airflow.utils.dates import days_ago

# ============================================================================
# IMPORTS: ETL Libraries
# ============================================================================
import pandas as pd
import requests
from io import StringIO
import json

# ============================================================================
# IMPORTS: Database & Security
# ============================================================================
from sqlalchemy import create_engine, inspect, text
from dotenv import load_dotenv


# ============================================================================
# CONFIGURATION: Logging Setup
# ============================================================================
# Configure logging for debugging and monitoring
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables from .env file
load_dotenv()


# ============================================================================
# CONFIGURATION: Environment Variables
# ============================================================================
# All database credentials are loaded from .env for security

# PostgreSQL Data Warehouse credentials (OLAP database)
DW_USER = os.getenv('DW_USER') or os.getenv('POSTGRES_USER', 'weather_user')
DW_PASSWORD = os.getenv('DW_PASSWORD') or os.getenv('POSTGRES_PASSWORD', 'weather_secure_password_123!')
DW_HOST = os.getenv('DW_HOST') or os.getenv('POSTGRES_HOST', 'weather-postgres')
DW_PORT = os.getenv('DW_PORT') or os.getenv('POSTGRES_PORT', '5432')
DW_NAME = os.getenv('DW_NAME') or os.getenv('POSTGRES_DB', 'weather_dw')

# Construct database URL for SQLAlchemy
DATABASE_URL = f'postgresql://{DW_USER}:{DW_PASSWORD}@{DW_HOST}:{DW_PORT}/{DW_NAME}'

# API Configuration
OPENMETEO_API_URL = os.getenv(
    'OPENMETEO_API_URL',
    'https://archive-api.open-meteo.com/v1/archive'
)
WEATHER_CITIES = os.getenv(
    'WEATHER_CITIES',
    'New York,London,Tokyo,New Delhi,Mumbai,Bengaluru,Chennai,Kolkata'
).split(',')

CITY_COORDINATES = {
    'New York': (40.7128, -74.0060),
    'London': (51.5074, -0.1278),
    'Tokyo': (35.6762, 139.6503),
    'New Delhi': (28.6139, 77.2090),
    'Mumbai': (19.0760, 72.8777),
    'Bengaluru': (12.9716, 77.5946),
    'Chennai': (13.0827, 80.2707),
    'Kolkata': (22.5726, 88.3639),
}

CITY_COUNTRIES = {
    'New York': 'USA',
    'London': 'UK',
    'Tokyo': 'Japan',
    'New Delhi': 'India',
    'Mumbai': 'India',
    'Bengaluru': 'India',
    'Chennai': 'India',
    'Kolkata': 'India',
}


# ============================================================================
# CONFIGURATION: DAG Defaults
# ============================================================================
# Settings applied to all tasks in this DAG

default_args = {
    'owner': 'airflow',
    'depends_on_past': False,
    'start_date': days_ago(1),
    'retries': 2,
    'retry_delay': timedelta(minutes=5),
    'catchup': False,
    'email_on_failure': False,
    'email_on_retry': False,
}

# ============================================================================
# DAG: Weather ETL Pipeline
# ============================================================================
# This DAG orchestrates the full ETL process

dag = DAG(
    dag_id='weather_etl_pipeline',
    default_args=default_args,
    description='Daily ETL pipeline for weather data ingestion, processing, and storage',
    schedule_interval='0 6 * * *',  # Run daily at 6:00 AM UTC
    catchup=False,
    tags=['weather', 'etl', 'production'],
    max_active_runs=1,  # Prevent parallel runs
)


# ============================================================================
# TASK 1: DATA INGESTION
# ============================================================================
# Fetch raw weather data from Open-Meteo API

def ingest_weather_data(**context):
    """
    Ingestion Task: Fetch weather data from Open-Meteo API.
    
    This function:
        1. Iterates through pre-defined cities (New York, London, Tokyo)
        2. Calls Open-Meteo historical weather API for past 7 days
        3. Saves raw JSON response to /tmp for processing
        4. Logs API calls for monitoring
        5. Pushes raw data to XCom for the next task
    
    Open-Meteo API: Free, no authentication required
    Data includes: temperature, humidity, precipitation, wind speed, pressure
    
    Args:
        **context: Airflow task context (includes task_instance for XCom)
    
    Returns:
        None (pushes data via XCom)
    
    Raises:
        requests.RequestException: If API call fails
    
    Example API Parameters:
        - start_date: 7 days ago
        - end_date: today
        - hourly: temperature_2m, humidity_2m, precipitation, etc.
    """
    
    logger.info("=" * 70)
    logger.info("TASK 1: DATA INGESTION - Fetching weather data from Open-Meteo API")
    logger.info("=" * 70)
    
    task_instance = context['task_instance']
    
    # ========================================================================
    # STEP 1: Define API parameters for each city
    # ========================================================================
    
    requested_cities = [city.strip() for city in WEATHER_CITIES if city.strip()]
    if not requested_cities:
        requested_cities = list(CITY_COORDINATES.keys())

    unknown_cities = [city for city in requested_cities if city not in CITY_COORDINATES]
    if unknown_cities:
        logger.warning(f"Unknown cities skipped: {', '.join(unknown_cities)}")

    selected_cities = [city for city in requested_cities if city in CITY_COORDINATES]
    if not selected_cities:
        selected_cities = list(CITY_COORDINATES.keys())

    city_coordinates = {city: CITY_COORDINATES[city] for city in selected_cities}
    
    # Calculate date range: last 7 days
    today = datetime.utcnow().date()
    start_date = (today - timedelta(days=7)).strftime('%Y-%m-%d')
    end_date = today.strftime('%Y-%m-%d')
    
    logger.info(f"Fetching data for date range: {start_date} to {end_date}")
    logger.info(f"Cities: {', '.join(city_coordinates.keys())}")
    
    # ========================================================================
    # STEP 2: Call API for each city and collect raw data
    # ========================================================================
    
    raw_data_dict = {}  # Store raw responses keyed by city
    
    for city_name, (lat, lon) in city_coordinates.items():
        try:
            logger.info(f"\n→ Calling API for {city_name} ({lat}, {lon})")
            
            # Construct API URL with parameters
            api_url = OPENMETEO_API_URL
            params = {
                'latitude': lat,
                'longitude': lon,
                'start_date': start_date,
                'end_date': end_date,
                'daily': 'temperature_2m_max,temperature_2m_min,temperature_2m_mean,'
                         'relative_humidity_2m_max,relative_humidity_2m_min,'
                         'precipitation_sum,windspeed_10m_max',
                'timezone': 'UTC',
            }
            
            # Make HTTP GET request
            response = requests.get(api_url, params=params, timeout=10)
            response.raise_for_status()  # Raise exception for HTTP errors
            
            # Parse JSON response
            data = response.json()
            logger.info(f"✓ Successfully received data for {city_name}")
            logger.info(f"  Records count: {len(data.get('daily', {}).get('time', []))}")
            
            raw_data_dict[city_name] = data
            
        except requests.exceptions.RequestException as e:
            logger.error(f"✗ Failed to fetch data for {city_name}: {str(e)}")
            raise
    
    # ========================================================================
    # STEP 3: Save raw data to XCom for processing task
    # ========================================================================
    # XCom allows data passing between tasks
    
    task_instance.xcom_push(key='raw_weather_data', value=raw_data_dict)
    logger.info("\n✓ Raw data pushed to XCom for processing")
    logger.info(f"  Total cities ingested: {len(raw_data_dict)}")
    
    return {
        'status': 'success',
        'cities_processed': list(raw_data_dict.keys()),
        'date_range': f'{start_date} to {end_date}'
    }


# ============================================================================
# TASK 2: DATA PROCESSING
# ============================================================================
# Transform and clean raw data using Pandas

def process_weather_data(**context):
    """
    Processing Task: Transform raw API data into clean, normalized format.
    
    This function:
        1. Retrieves raw data from ingestion task (via XCom)
        2. Converts raw JSON to Pandas DataFrames
        3. Performs data cleaning:
           - Handles missing values (forward fill, then drop)
           - Normalizes temperature units (API provides °C)
           - Validates data types (floats for metrics)
           - Adds city metadata (name, coordinates)
        4. Validates data against constraints (e.g., temp_min <= temp_max)
        5. Transforms to match star schema structure
        6. Outputs clean Pandas DataFrame to XCom
    
    Data Validation Rules:
        - Temperature: -60°C to 60°C (realistic range)
        - Humidity: 0-100%
        - Precipitation: >= 0 mm
        - Wind speed: >= 0 km/h
    
    Args:
        **context: Airflow task context
    
    Returns:
        Dictionary with processing summary (rows_processed, validation_results)
    
    Raises:
        ValueError: If data validation fails
    """
    
    logger.info("=" * 70)
    logger.info("TASK 2: DATA PROCESSING - Cleaning and transforming weather data")
    logger.info("=" * 70)
    
    task_instance = context['task_instance']
    
    # ========================================================================
    # STEP 1: Retrieve raw data from ingestion task
    # ========================================================================
    
    raw_data = task_instance.xcom_pull(
        task_ids='ingest_weather_data',
        key='raw_weather_data'
    )
    
    if not raw_data:
        raise ValueError("No raw data received from ingestion task")
    
    logger.info(f"✓ Retrieved raw data for {len(raw_data)} cities from XCom")
    
    # ========================================================================
    # STEP 2: Convert raw API responses to Pandas DataFrames
    # ========================================================================
    
    city_coordinates = CITY_COORDINATES
    
    processed_dfs = []
    
    for city_name, api_response in raw_data.items():
        logger.info(f"\n→ Processing data for {city_name}")
        
        try:
            # Extract daily data from API response
            daily_data = api_response['daily']
            total_days = len(daily_data['time'])

            def safe_daily_values(key):
                values = daily_data.get(key)
                if not values or len(values) != total_days:
                    return [None] * total_days
                return values
            
            # Create DataFrame from API response
            df = pd.DataFrame({
                'date': pd.to_datetime(daily_data['time']),
                'temperature_max': safe_daily_values('temperature_2m_max'),
                'temperature_min': safe_daily_values('temperature_2m_min'),
                'temperature_avg': safe_daily_values('temperature_2m_mean'),
                'humidity_max': safe_daily_values('relative_humidity_2m_max'),
                'humidity_min': safe_daily_values('relative_humidity_2m_min'),
                'precipitation': safe_daily_values('precipitation_sum'),
                'wind_speed_max': safe_daily_values('windspeed_10m_max'),
                'pressure': safe_daily_values('pressure_msl_max'),
            })
            
            logger.info(f"  Initial rows: {len(df)}")
            
            # ================================================================
            # STEP 3: Data Cleaning - Handle missing values
            # ================================================================
            
            # Forward fill: carry forward last valid value
            df = df.ffill()
            
            # Drop rows missing required metrics only
            required_columns = [
                'date',
                'temperature_max',
                'temperature_min',
                'temperature_avg',
                'humidity_max',
                'humidity_min',
                'precipitation',
                'wind_speed_max',
            ]
            initial_rows = len(df)
            df.dropna(subset=required_columns, inplace=True)
            dropped_rows = initial_rows - len(df)
            
            if dropped_rows > 0:
                logger.warning(f"  Dropped {dropped_rows} rows with missing values")
            
            # ================================================================
            # STEP 4: Data Type Normalization
            # ================================================================
            
            # Ensure all metrics are numeric (float)
            numeric_columns = [
                'temperature_max', 'temperature_min', 'temperature_avg',
                'humidity_max', 'humidity_min', 'precipitation',
                'wind_speed_max', 'pressure'
            ]
            
            for col in numeric_columns:
                df[col] = pd.to_numeric(df[col], errors='coerce')
            
            # ================================================================
            # STEP 5: Add City Metadata
            # ================================================================
            
            df['city_name'] = city_name
            df['country'] = CITY_COUNTRIES.get(city_name, 'Unknown')
            df['latitude'] = city_coordinates[city_name][0]
            df['longitude'] = city_coordinates[city_name][1]
            
            # ================================================================
            # STEP 6: Data Validation - Check business rules
            # ================================================================
            
            # Validate temperature range (-60°C to 60°C)
            temp_min_valid = df[
                (df['temperature_min'] >= -60) & (df['temperature_min'] <= 60)
            ].shape[0] == len(df)
            temp_max_valid = df[
                (df['temperature_max'] >= -60) & (df['temperature_max'] <= 60)
            ].shape[0] == len(df)
            
            # Validate temperature ordering (min <= max)
            temp_order_valid = (df['temperature_min'] <= df['temperature_max']).all()
            
            # Validate humidity range (0-100%)
            humidity_valid = df[
                (df['humidity_max'] >= 0) & (df['humidity_max'] <= 100)
            ].shape[0] == len(df)
            
            # Validate precipitation >= 0
            precip_valid = (df['precipitation'] >= 0).all()
            
            validation_results = {
                'temperature_range_valid': temp_min_valid and temp_max_valid,
                'temperature_order_valid': temp_order_valid,
                'humidity_valid': humidity_valid,
                'precipitation_valid': precip_valid,
            }
            
            if not all(validation_results.values()):
                logger.warning(f"  Validation issues for {city_name}: {validation_results}")
            else:
                logger.info(f"  ✓ All validations passed")
            
            # ================================================================
            # STEP 7: Reorder columns to match Star Schema
            # ================================================================
            
            df = df[[
                'date', 'city_name', 'country', 'latitude', 'longitude',
                'temperature_max', 'temperature_min', 'temperature_avg',
                'humidity_max', 'humidity_min', 'precipitation',
                'wind_speed_max', 'pressure'
            ]]
            
            logger.info(f"  Final rows: {len(df)}")
            logger.info(f"  Columns: {', '.join(df.columns.tolist())}")
            
            processed_dfs.append(df)
            
        except Exception as e:
            logger.error(f"  ✗ Error processing {city_name}: {str(e)}")
            raise
    
    # ========================================================================
    # STEP 8: Combine all city data and push to XCom
    # ========================================================================
    
    combined_df = pd.concat(processed_dfs, ignore_index=True)
    logger.info(f"\n✓ Combined processed data: {len(combined_df)} total rows")
    
    # Convert DataFrame to JSON for XCom (JSON serialization safer for XCom)
    json_data = combined_df.to_json(orient='records')
    task_instance.xcom_push(key='processed_weather_data', value=json_data)
    
    return {
        'status': 'success',
        'rows_processed': len(combined_df),
        'cities': combined_df['city_name'].unique().tolist(),
        'date_range': f"{combined_df['date'].min()} to {combined_df['date'].max()}"
    }


# ============================================================================
# TASK 3: DATA STORAGE/LOAD
# ============================================================================
# Load processed data into PostgreSQL star schema

def load_weather_data(**context):
    """
    Storage Task: Load cleaned data into PostgreSQL Data Warehouse.
    
    This function:
        1. Retrieves processed data from processing task (via XCom)
        2. Creates SQLAlchemy engine for secure database connection
        3. Populates dimension tables (dim_location, dim_date)
        4. Loads fact table (fact_weather) with upsert logic
        5. Validates record counts and data integrity
        6. Logs insertion summary for monitoring
    
    Database Credentials: Loaded from .env for security
    
    Star Schema Tables:
        - dim_location: Cities (New York, London, Tokyo)
        - dim_date: Calendar dates (pre-populated in init.sql)
        - fact_weather: Daily measurements (grain: 1 row per city per day)
    
    Args:
        **context: Airflow task context
    
    Returns:
        Dictionary with load summary (rows_loaded, dimensions_loaded)
    
    Raises:
        sqlalchemy.exc.SQLAlchemyError: If database operation fails
    """
    
    logger.info("=" * 70)
    logger.info("TASK 3: DATA STORAGE - Loading processed data to PostgreSQL DW")
    logger.info("=" * 70)
    
    task_instance = context['task_instance']
    
    # ========================================================================
    # STEP 1: Retrieve processed data from processing task
    # ========================================================================
    
    json_data = task_instance.xcom_pull(
        task_ids='process_weather_data',
        key='processed_weather_data'
    )
    
    if not json_data or json_data == "[]":
        logger.warning("No processed data received from processing task")
        return {
            'status': 'skipped',
            'rows_loaded': 0,
            'timestamp': datetime.utcnow().isoformat()
        }
    
    # Convert JSON back to DataFrame
    df = pd.read_json(StringIO(json_data), orient='records')
    if df.empty:
        logger.warning("Processed dataset is empty; skipping load")
        return {
            'status': 'skipped',
            'rows_loaded': 0,
            'timestamp': datetime.utcnow().isoformat()
        }
    df['date'] = pd.to_datetime(df['date'])
    
    logger.info(f"✓ Retrieved processed data: {len(df)} rows from XCom")
    
    # ========================================================================
    # STEP 2: Create SQLAlchemy engine for secure database connection
    # ========================================================================
    
    try:
        engine = create_engine(DATABASE_URL, echo=False)
        logger.info(f"✓ Created database connection to {DW_HOST}:{DW_PORT}/{DW_NAME}")
    except Exception as e:
        logger.error(f"✗ Failed to create database connection: {str(e)}")
        raise

    inspector = inspect(engine)
    if not inspector.has_table("fact_weather_analysis"):
        logger.warning("fact_weather_analysis table not found; run init.sql to create it")
        return {
            'status': 'skipped',
            'rows_analyzed': 0,
            'timestamp': datetime.utcnow().isoformat()
        }
    
    # ========================================================================
    # STEP 3: Insert/Update dimension tables (dim_location, dim_date)
    # ========================================================================
    # Use upserts so the pipeline can run across date ranges safely
    
    try:
        with engine.begin() as connection:
            # Insert any missing locations
            location_insert = text("""
                INSERT INTO dim_location (city_name, country, latitude, longitude)
                VALUES (:city_name, :country, :latitude, :longitude)
                ON CONFLICT (city_name, country) DO NOTHING
            """)
            location_rows = (
                df[["city_name", "country", "latitude", "longitude"]]
                .drop_duplicates()
                .to_dict(orient="records")
            )
            connection.execute(location_insert, location_rows)
            
            # Ensure dim_date covers the data range
            max_date_in_data = df['date'].max().date()
            min_date_in_data = df['date'].min().date()
            
            date_insert = text("""
                INSERT INTO dim_date (
                    date_value,
                    year,
                    month,
                    day,
                    day_of_week,
                    day_of_year,
                    week_of_year,
                    is_weekend,
                    day_name,
                    month_name
                )
                SELECT
                    d::date AS date_value,
                    EXTRACT(YEAR FROM d)::INT,
                    EXTRACT(MONTH FROM d)::INT,
                    EXTRACT(DAY FROM d)::INT,
                    EXTRACT(ISODOW FROM d)::INT - 1,
                    EXTRACT(DOY FROM d)::INT,
                    EXTRACT(WEEK FROM d)::INT,
                    EXTRACT(ISODOW FROM d)::INT IN (6, 7),
                    TRIM(TO_CHAR(d, 'Day')),
                    TRIM(TO_CHAR(d, 'Month'))
                FROM generate_series(CAST(:min_date AS DATE), CAST(:max_date AS DATE), INTERVAL '1 day') AS d
                ON CONFLICT (date_value) DO NOTHING
            """)
            connection.execute(
                date_insert,
                {"min_date": min_date_in_data, "max_date": max_date_in_data}
            )
            
            logger.info(
                f"✓ Ensured dimensions cover {min_date_in_data} to {max_date_in_data}"
            )
    
    except Exception as e:
        logger.error(f"✗ Error checking/updating dimensions: {str(e)}")
        raise
    
    # ========================================================================
    # STEP 4: Transform DataFrame to match fact_weather schema
    # ========================================================================
    
    # Query location IDs
    with engine.connect() as connection:
        location_query = text("SELECT location_id, city_name FROM dim_location")
        locations = {row[1]: row[0] for row in connection.execute(location_query).fetchall()}
        
        date_query = text(
            "SELECT date_id, date_value FROM dim_date WHERE date_value BETWEEN :min_date AND :max_date"
        )
        date_rows = connection.execute(
            date_query,
            {"min_date": min_date_in_data, "max_date": max_date_in_data}
        ).fetchall()
        dates = {row[1]: row[0] for row in date_rows}
    
    # Map city names and dates to their IDs
    df['location_id'] = df['city_name'].map(locations)
    df['date_id'] = df['date'].dt.date.map(dates)
    
    # Build fact table DataFrame with required columns
    fact_df = df[[
        'location_id', 'date_id',
        'temperature_min', 'temperature_max', 'temperature_avg',
        'humidity_max', 'humidity_min', 'precipitation',
        'wind_speed_max', 'pressure'
    ]].copy()
    
    # Add derived columns
    fact_df['record_source'] = 'OpenMeteo'
    fact_df['data_quality_flag'] = 'Complete'
    
    # Rename columns to match fact_weather schema
    fact_df.rename(columns={
        'humidity_max': 'humidity',
        'wind_speed_max': 'wind_speed_max',
        'pressure': 'pressure_hpa'
    }, inplace=True)
    
    logger.info(f"Prepared {len(fact_df)} rows for fact_weather table")
    
    # ========================================================================
    # STEP 5: Upsert (Insert or Update) into fact_weather
    # ========================================================================
    # If record exists, update it; otherwise insert
    
    try:
        if fact_df['location_id'].isna().any() or fact_df['date_id'].isna().any():
            raise ValueError("Missing location_id or date_id mappings in fact data")
        
        with engine.begin() as connection:
            fact_df = fact_df.where(pd.notnull(fact_df), None)
            
            upsert_stmt = text("""
                INSERT INTO fact_weather (
                    location_id,
                    date_id,
                    temperature_min,
                    temperature_max,
                    temperature_avg,
                    humidity,
                    precipitation,
                    wind_speed_max,
                    pressure_hpa,
                    record_source,
                    data_quality_flag
                ) VALUES (
                    :location_id,
                    :date_id,
                    :temperature_min,
                    :temperature_max,
                    :temperature_avg,
                    :humidity,
                    :precipitation,
                    :wind_speed_max,
                    :pressure_hpa,
                    :record_source,
                    :data_quality_flag
                )
                ON CONFLICT (location_id, date_id) DO UPDATE SET
                    temperature_min = EXCLUDED.temperature_min,
                    temperature_max = EXCLUDED.temperature_max,
                    temperature_avg = EXCLUDED.temperature_avg,
                    humidity = EXCLUDED.humidity,
                    precipitation = EXCLUDED.precipitation,
                    wind_speed_max = EXCLUDED.wind_speed_max,
                    pressure_hpa = EXCLUDED.pressure_hpa,
                    record_source = EXCLUDED.record_source,
                    data_quality_flag = EXCLUDED.data_quality_flag,
                    updated_at = CURRENT_TIMESTAMP
            """)
            
            connection.execute(upsert_stmt, fact_df.to_dict(orient='records'))
            
            logger.info(f"✓ Successfully loaded {len(fact_df)} rows to fact_weather")
            
    except Exception as e:
        logger.error(f"✗ Failed to load data: {str(e)}")
        raise
    
    # ========================================================================
    # STEP 6: Validate loaded data
    # ========================================================================
    
    try:
        with engine.connect() as connection:
            count_query = text("SELECT COUNT(*) FROM fact_weather")
            total_records = connection.execute(count_query).scalar()
            
            logger.info(f"✓ Current total records in fact_weather: {total_records}")
    
    except Exception as e:
        logger.warning(f"Could not verify data load: {str(e)}")
    
    logger.info("\n" + "=" * 70)
    logger.info("✓ ETL PIPELINE COMPLETED SUCCESSFULLY")
    logger.info("=" * 70)
    
    return {
        'status': 'success',
        'rows_loaded': len(fact_df),
        'timestamp': datetime.utcnow().isoformat()
    }


# ============================================================================
# TASK 4: ANALYSIS
# ============================================================================
# Derive rolling averages and anomaly metrics for dashboard analysis

def analyze_weather_data(**context):
    """
    Analysis Task: Build derived metrics for anomaly detection and trend analysis.

    This function:
        1. Computes rolling 7-day averages per city
        2. Computes temperature z-score anomalies per city
        3. Stores results in fact_weather_analysis for dashboard use
    """

    logger.info("=" * 70)
    logger.info("TASK 4: ANALYSIS - Building anomaly and trend analytics")
    logger.info("=" * 70)

    analysis_days = int(os.getenv('ANALYSIS_DAYS', '30'))

    try:
        engine = create_engine(DATABASE_URL, echo=False)
        logger.info(f"✓ Created database connection to {DW_HOST}:{DW_PORT}/{DW_NAME}")
    except Exception as e:
        logger.error(f"✗ Failed to create database connection: {str(e)}")
        raise

    with engine.connect() as connection:
        total_records = connection.execute(text("SELECT COUNT(*) FROM fact_weather")).scalar()

    if not total_records:
        logger.warning("No fact data available; skipping analysis task")
        return {
            'status': 'skipped',
            'rows_analyzed': 0,
            'timestamp': datetime.utcnow().isoformat()
        }

    analysis_query = text("""
        WITH base AS (
            SELECT
                fw.location_id,
                fw.date_id,
                dd.date_value,
                fw.temperature_avg,
                fw.precipitation
            FROM fact_weather fw
            INNER JOIN dim_date dd ON fw.date_id = dd.date_id
            WHERE dd.date_value >= CURRENT_DATE - make_interval(days => :days)
        ),
        calc AS (
            SELECT
                location_id,
                date_id,
                temperature_avg,
                AVG(temperature_avg) OVER (
                    PARTITION BY location_id
                    ORDER BY date_value
                    ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
                ) AS temperature_avg_7day,
                (temperature_avg - AVG(temperature_avg) OVER (PARTITION BY location_id)) /
                    NULLIF(STDDEV_SAMP(temperature_avg) OVER (PARTITION BY location_id), 0)
                    AS temperature_zscore,
                SUM(precipitation) OVER (
                    PARTITION BY location_id
                    ORDER BY date_value
                    ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
                ) AS precipitation_7day
            FROM base
        )
        INSERT INTO fact_weather_analysis (
            location_id,
            date_id,
            temperature_avg,
            temperature_avg_7day,
            temperature_zscore,
            precipitation_7day
        )
        SELECT
            location_id,
            date_id,
            temperature_avg,
            temperature_avg_7day,
            temperature_zscore,
            precipitation_7day
        FROM calc
        ON CONFLICT (location_id, date_id) DO UPDATE SET
            temperature_avg = EXCLUDED.temperature_avg,
            temperature_avg_7day = EXCLUDED.temperature_avg_7day,
            temperature_zscore = EXCLUDED.temperature_zscore,
            precipitation_7day = EXCLUDED.precipitation_7day,
            updated_at = CURRENT_TIMESTAMP
    """)

    with engine.begin() as connection:
        result = connection.execute(analysis_query, {"days": analysis_days})
        rows_analyzed = result.rowcount or 0

    logger.info(f"✓ Analysis table updated (rows: {rows_analyzed})")

    return {
        'status': 'success',
        'rows_analyzed': rows_analyzed,
        'analysis_days': analysis_days,
        'timestamp': datetime.utcnow().isoformat()
    }


# ============================================================================
# DEFINE DAG TASKS
# ============================================================================
# Create PythonOperator instances for each ETL stage

task_ingest = PythonOperator(
    task_id='ingest_weather_data',
    python_callable=ingest_weather_data,
    provide_context=True,
    dag=dag,
)

task_process = PythonOperator(
    task_id='process_weather_data',
    python_callable=process_weather_data,
    provide_context=True,
    dag=dag,
)

task_load = PythonOperator(
    task_id='load_weather_data',
    python_callable=load_weather_data,
    provide_context=True,
    dag=dag,
)

task_analyze = PythonOperator(
    task_id='analyze_weather_data',
    python_callable=analyze_weather_data,
    provide_context=True,
    dag=dag,
)

# ============================================================================
# TASK DEPENDENCIES: Define DAG workflow
# ============================================================================
# Linear pipeline: Ingest → Process → Load

task_ingest >> task_process >> task_load >> task_analyze

-- ============================================================================
-- SQL: Initialize Star Schema for Weather Data Warehouse
-- ============================================================================
-- This script creates the dimensional and fact tables for the weather
-- analytical database. The schema follows a classic star design with:
--   - Central FACT table: fact_weather (grain: 1 row per city per day)
--   - Dimension tables: dim_location, dim_date
--   - All tables indexed for OLAP query performance
-- ============================================================================

-- ============================================================================
-- CLEANUP: Drop existing tables (if needed for fresh initialization)
-- ============================================================================
-- Comment out if you want to preserve existing data

DROP TABLE IF EXISTS fact_weather_analysis CASCADE;
DROP TABLE IF EXISTS fact_weather CASCADE;
DROP TABLE IF EXISTS dim_location CASCADE;
DROP TABLE IF EXISTS dim_date CASCADE;


-- ============================================================================
-- DIMENSION TABLE 1: dim_location
-- ============================================================================
-- Purpose: Store geographic information about cities
-- Grain: One row per unique city
-- Updates: Slowly Changing Dimension Type 1 (overwrite on change)

CREATE TABLE dim_location (
    location_id SERIAL PRIMARY KEY,
    city_name VARCHAR(100) NOT NULL,
    country VARCHAR(100) NOT NULL,
    latitude DECIMAL(9, 6) NOT NULL,
    longitude DECIMAL(9, 6) NOT NULL,
    timezone VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster city lookups
CREATE INDEX idx_dim_location_city ON dim_location(city_name);

-- Add unique constraint to prevent duplicate cities
ALTER TABLE dim_location ADD CONSTRAINT uq_city_country 
    UNIQUE(city_name, country);

-- Seed dimension data
INSERT INTO dim_location (city_name, country, latitude, longitude, timezone)
VALUES 
    ('New York', 'USA', 40.7128, -74.0060, 'America/New_York'),
    ('London', 'UK', 51.5074, -0.1278, 'Europe/London'),
    ('Tokyo', 'Japan', 35.6762, 139.6503, 'Asia/Tokyo')
ON CONFLICT (city_name, country) DO NOTHING;


-- ============================================================================
-- DIMENSION TABLE 2: dim_date
-- ============================================================================
-- Purpose: Store time-related attributes for dimensional queries
-- Grain: One row per calendar day
-- Benefits: Support time-based aggregations without joins on raw dates

CREATE TABLE dim_date (
    date_id SERIAL PRIMARY KEY,
    date_value DATE NOT NULL UNIQUE,
    year INT NOT NULL,
    month INT NOT NULL,
    day INT NOT NULL,
    day_of_week INT NOT NULL,  -- 0=Monday, 6=Sunday (ISO 8601)
    day_of_year INT NOT NULL,
    week_of_year INT NOT NULL,
    is_weekend BOOLEAN NOT NULL,
    day_name VARCHAR(20),
    month_name VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for time-based queries
CREATE INDEX idx_dim_date_value ON dim_date(date_value);
CREATE INDEX idx_dim_date_year_month ON dim_date(year, month);

-- ============================================================================
-- Pre-fill dim_date around current year
-- ============================================================================
-- Uses generate_series so the warehouse stays current without manual edits

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
FROM generate_series(
    date_trunc('year', CURRENT_DATE) - INTERVAL '3 years',
    date_trunc('year', CURRENT_DATE) + INTERVAL '2 years' - INTERVAL '1 day',
    INTERVAL '1 day'
) AS d
ON CONFLICT (date_value) DO NOTHING;


-- ============================================================================
-- FACT TABLE: fact_weather
-- ============================================================================
-- Purpose: Store weather measurements with references to dimensions
-- Grain: One row per location per day (multiple measurements per day possible)
-- Metrics: Temperature (min, max, avg), humidity, precipitation, wind speed
-- 
-- Design principles:
--   - Foreign keys reference dimension tables
--   - Denormalized metrics for query efficiency
--   - Timestamps for audit trail
--   - Data quality flags

CREATE TABLE fact_weather (
    weather_id SERIAL PRIMARY KEY,
    
    -- Foreign Keys to Dimensions
    location_id INT NOT NULL REFERENCES dim_location(location_id),
    date_id INT NOT NULL REFERENCES dim_date(date_id),
    
    -- Fact Table Metrics (Weather Measurements)
    temperature_min DECIMAL(5, 2),          -- Minimum temperature in °C
    temperature_max DECIMAL(5, 2),          -- Maximum temperature in °C
    temperature_avg DECIMAL(5, 2),          -- Average temperature in °C
    
    humidity DECIMAL(5, 2),                 -- Humidity percentage (0-100)
    precipitation DECIMAL(8, 2),            -- Precipitation in mm
    wind_speed_max DECIMAL(6, 2),           -- Maximum wind speed in km/h
    wind_direction_deg INT,                 -- Wind direction in degrees (0-360)
    
    pressure_hpa DECIMAL(7, 2),             -- Atmospheric pressure in hPa
    cloud_cover DECIMAL(5, 2),              -- Cloud cover percentage (0-100)
    visibility_km DECIMAL(6, 2),            -- Visibility in kilometers
    
    -- Quality and Audit Columns
    record_source VARCHAR(50),              -- Where data came from (e.g., 'OpenMeteo')
    data_quality_flag VARCHAR(20),          -- 'Complete', 'Partial', 'Missing'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure only one weather record per location per day
    UNIQUE(location_id, date_id)
);

-- ============================================================================
-- Indexes on fact_weather for Query Performance
-- ============================================================================
-- These indexes support common analytical queries

-- Composite index for location-date queries
CREATE INDEX idx_fact_weather_location_date 
    ON fact_weather(location_id, date_id);

-- Index for date range queries (common in time-series analysis)
CREATE INDEX idx_fact_weather_date_id 
    ON fact_weather(date_id);

-- Index for location-based aggregations
CREATE INDEX idx_fact_weather_location_id 
    ON fact_weather(location_id);

-- Index for finding recent data
CREATE INDEX idx_fact_weather_created_at 
    ON fact_weather(created_at DESC);


-- ============================================================================
-- ANALYSIS TABLE: fact_weather_analysis
-- ============================================================================
-- Purpose: Store derived analytics (rolling averages, anomaly scores)
-- Grain: One row per location per day

CREATE TABLE fact_weather_analysis (
    analysis_id SERIAL PRIMARY KEY,
    location_id INT NOT NULL REFERENCES dim_location(location_id),
    date_id INT NOT NULL REFERENCES dim_date(date_id),

    temperature_avg DECIMAL(5, 2),
    temperature_avg_7day DECIMAL(5, 2),
    temperature_zscore DECIMAL(8, 4),
    precipitation_7day DECIMAL(8, 2),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(location_id, date_id)
);

CREATE INDEX idx_fact_weather_analysis_location_date
    ON fact_weather_analysis(location_id, date_id);
CREATE INDEX idx_fact_weather_analysis_date_id
    ON fact_weather_analysis(date_id);


-- ============================================================================
-- VIEWS for Dashboard Queries
-- ============================================================================
-- Pre-built views to optimize dashboard performance

-- View: 7-Day Temperature Trends
CREATE OR REPLACE VIEW vw_temperature_trends_7day AS
SELECT 
    dl.city_name,
    dd.date_value,
    fw.temperature_avg,
    fw.temperature_min,
    fw.temperature_max,
    fw.humidity
FROM fact_weather fw
INNER JOIN dim_location dl ON fw.location_id = dl.location_id
INNER JOIN dim_date dd ON fw.date_id = dd.date_id
WHERE dd.date_value >= CURRENT_DATE - make_interval(days => 7)
ORDER BY dl.city_name, dd.date_value ASC;

-- View: Rolling 7-day temperature averages (window function)
CREATE OR REPLACE VIEW vw_temperature_trends_rolling AS
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
WHERE dd.date_value >= CURRENT_DATE - make_interval(days => 30)
ORDER BY dl.city_name, dd.date_value ASC;

-- View: Weather Summary by Location
CREATE OR REPLACE VIEW vw_weather_summary_by_location AS
SELECT 
    dl.city_name,
    COUNT(*) as record_count,
    MAX(fw.temperature_max) as max_temperature,
    MIN(fw.temperature_min) as min_temperature,
    AVG(fw.temperature_avg) as avg_temperature,
    AVG(fw.humidity) as avg_humidity,
    SUM(fw.precipitation) as total_precipitation,
    MAX(fw.wind_speed_max) as max_wind_speed
FROM fact_weather fw
INNER JOIN dim_location dl ON fw.location_id = dl.location_id
GROUP BY dl.location_id, dl.city_name;

-- View: Temperature anomaly scores by city (z-score)
CREATE OR REPLACE VIEW vw_temperature_anomalies AS
SELECT
    dl.city_name,
    dd.date_value,
    fw.temperature_avg,
    (fw.temperature_avg - AVG(fw.temperature_avg) OVER (PARTITION BY dl.city_name)) /
        NULLIF(STDDEV_SAMP(fw.temperature_avg) OVER (PARTITION BY dl.city_name), 0)
        AS temperature_zscore
FROM fact_weather fw
INNER JOIN dim_location dl ON fw.location_id = dl.location_id
INNER JOIN dim_date dd ON fw.date_id = dd.date_id;

-- View: Monthly Weather Statistics
CREATE OR REPLACE VIEW vw_monthly_weather_stats AS
SELECT 
    dl.city_name,
    dd.year,
    dd.month,
    COUNT(*) as days_recorded,
    AVG(fw.temperature_avg) as avg_temperature,
    MAX(fw.temperature_max) as max_temperature_recorded,
    MIN(fw.temperature_min) as min_temperature_recorded,
    SUM(fw.precipitation) as total_precipitation,
    AVG(fw.humidity) as avg_humidity
FROM fact_weather fw
INNER JOIN dim_location dl ON fw.location_id = dl.location_id
INNER JOIN dim_date dd ON fw.date_id = dd.date_id
GROUP BY dl.location_id, dl.city_name, dd.year, dd.month
ORDER BY dd.year DESC, dd.month DESC;


-- ============================================================================
-- DATA QUALITY CHECKS & CONSTRAINTS
-- ============================================================================

-- Add check constraint to ensure valid temperature ranges
ALTER TABLE fact_weather 
ADD CONSTRAINT ck_temperature_min_max 
CHECK (temperature_min <= temperature_max);

-- Add check constraint for humidity percentage (0-100)
ALTER TABLE fact_weather 
ADD CONSTRAINT ck_humidity_range 
CHECK (humidity >= 0 AND humidity <= 100);

-- Add check constraint for valid cloud cover percentage
ALTER TABLE fact_weather 
ADD CONSTRAINT ck_cloud_cover_range 
CHECK (cloud_cover >= 0 AND cloud_cover <= 100);

-- Add check constraint for valid wind direction
ALTER TABLE fact_weather 
ADD CONSTRAINT ck_wind_direction_range 
CHECK (wind_direction_deg >= 0 AND wind_direction_deg <= 360);


-- ============================================================================
-- FINAL VERIFICATION
-- ============================================================================
-- Query to verify schema creation

SELECT 
    'dim_location' as table_name, COUNT(*) as record_count 
FROM dim_location
UNION ALL
SELECT 
    'dim_date', COUNT(*) 
FROM dim_date
UNION ALL
SELECT 
    'fact_weather', COUNT(*) 
FROM fact_weather;

-- Print success message
\echo 'SUCCESS: Star Schema initialization complete!'
\echo 'Tables created: dim_location, dim_date, fact_weather, fact_weather_analysis'
\echo 'Views created: vw_temperature_trends_7day, vw_temperature_trends_rolling, vw_temperature_anomalies, vw_weather_summary_by_location, vw_monthly_weather_stats'

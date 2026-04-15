-- ============================================================================
-- SQL: Add Analysis Table for Weather Analytics (Non-Destructive)
-- ============================================================================
-- Purpose: Create fact_weather_analysis without dropping existing data
-- Run this if you already have data loaded and want to enable analysis
-- ============================================================================

CREATE TABLE IF NOT EXISTS fact_weather_analysis (
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

CREATE INDEX IF NOT EXISTS idx_fact_weather_analysis_location_date
    ON fact_weather_analysis(location_id, date_id);

CREATE INDEX IF NOT EXISTS idx_fact_weather_analysis_date_id
    ON fact_weather_analysis(date_id);

\echo 'SUCCESS: fact_weather_analysis is ready.'

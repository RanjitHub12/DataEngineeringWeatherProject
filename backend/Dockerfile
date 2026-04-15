# ============================================================================
# Dockerfile: FastAPI Backend for Production Deployment
# ============================================================================
# This Dockerfile builds a production-ready FastAPI application image.
# 
# Target Platforms:
#   - Render.com (recommended for academic project)
#   - AWS Elastic Container Service (ECS)
#   - Google Cloud Run
#   - Any Docker-compatible hosting platform
#
# Build: docker build -t weather-dashboard-backend .
# Run:   docker run -p 8000:8000 --env-file .env weather-dashboard-backend
# ============================================================================

# ============================================================================
# STAGE 1: Builder Image
# ============================================================================
# Multi-stage build reduces final image size

FROM python:3.11-slim as builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies  
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt


# ============================================================================
# STAGE 2: Runtime Image (Production)
# ============================================================================
# Smaller final image with only runtime dependencies

FROM python:3.11-slim

WORKDIR /app

# Install runtime dependencies only (minimal image size)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy Python packages from builder stage
COPY --from=builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

# Copy application code
COPY main.py .
COPY .env.example .

# Create non-root user for security
RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app
USER appuser

# Health check for Docker/Kubernetes
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Expose port
EXPOSE 8000

# STARTUP COMMAND
# ============================================================================
# Run FastAPI application with Uvicorn
# 
# For local development:
#   uvicorn main:app --host 0.0.0.0 --port 8000 --reload
#
# For production on Render/similar:
#   uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
#
# The environment automatically sets RENDER=true on Render.com,
# so we can adjust configurations accordingly.

CMD ["python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]

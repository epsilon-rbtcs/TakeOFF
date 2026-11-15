# Ground API image.
#
# Build from the spec root (the directory containing schema.sql):
#   cd astronaut_health_spec_v0_2/astronaut_health_spec
#   docker build -f services/api/Dockerfile -t ground-api:0.3.0 .
#
# Or use services/api/docker-compose.yml, which sets this build context.

FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    SCHEMA_SQL_PATH=/srv/schema.sql

WORKDIR /srv

# Keep dependency installation in its own layer.
COPY services/api/requirements.txt /tmp/requirements.txt
RUN python -m pip install --upgrade pip \
    && python -m pip install -r /tmp/requirements.txt

# schema.sql is the canonical DDL; the app resolves it via SCHEMA_SQL_PATH.
COPY schema.sql /srv/schema.sql
COPY services/api /srv/api

WORKDIR /srv/api

# Run as an unprivileged user.
RUN useradd --create-home --uid 10001 ground \
    && chown -R ground:ground /srv
USER ground

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD python -c "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8000/api/v1/health', timeout=4).status == 200 else 1)"

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

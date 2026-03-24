# ─────────────────────────────────────────────────────────────────────────────
# Stage 1: builder — install Python deps with build tools
# python:3.11-slim (glibc) is used instead of alpine because asyncpg and
# cryptography have C extensions that fail to compile reliably on musl libc.
# ─────────────────────────────────────────────────────────────────────────────
FROM python:3.11-slim AS builder

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    pkg-config \
    libcairo2-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# ─────────────────────────────────────────────────────────────────────────────
# Stage 2: runtime — lean image without build tools
# ─────────────────────────────────────────────────────────────────────────────
FROM python:3.11-slim AS runtime

WORKDIR /app

# libpq5 is the runtime shared library asyncpg links against
# libcairo2 is needed by pycairo at runtime
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    libcairo2 \
    && rm -rf /var/lib/apt/lists/*

# Copy installed packages from builder stage
COPY --from=builder /install /usr/local

# Copy application source
COPY . .

# Pre-create upload subdirectories so the path exists even on a fresh volume
RUN mkdir -p uploads/resumes uploads/jds uploads/offers uploads/avatars

# Copy and make entrypoint executable
COPY entrypoint.sh /entrypoint.sh
RUN sed -i 's/\r$//' /entrypoint.sh && chmod +x /entrypoint.sh

EXPOSE 8000

ENTRYPOINT ["/entrypoint.sh"]

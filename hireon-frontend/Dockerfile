# ─────────────────────────────────────────────────────────────────────────────
# Stage 1: Node build
# ─────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy lockfile first so npm ci layer is cached unless dependencies change
COPY package.json package-lock.json ./
RUN npm ci --prefer-offline

# VITE_API_BASE_URL is baked into the JS bundle at build time.
# Set to "http://localhost" so:
#   - Axios baseURL = "http://localhost"  → all API requests go to port 80 → nginx proxies to backend
#   - useWebSocket: "http://localhost".replace('http','ws') = "ws://localhost" → nginx upgrades WS
ARG VITE_API_BASE_URL=""
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

COPY . .
RUN npm run build

# ─────────────────────────────────────────────────────────────────────────────
# Stage 2: nginx serve
# ─────────────────────────────────────────────────────────────────────────────
FROM nginx:1.27-alpine AS runtime

# Remove the default nginx site config
RUN rm /etc/nginx/conf.d/default.conf

# Our custom config: serves SPA + proxies /v1, /static, /ws to backend
COPY nginx.conf /etc/nginx/conf.d/hireon.conf

# Copy the Vite production build
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

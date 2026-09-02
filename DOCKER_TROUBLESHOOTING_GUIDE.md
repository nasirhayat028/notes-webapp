# Notes App — Docker & Reverse Proxy Troubleshooting Guide

Complete diagnostic guide for debugging Docker containerization, Nginx reverse proxy issues, and container networking errors in the Notes App.

---

## 📋 Table of Contents

1. [Overview of Issues](#-overview-of-issues)
2. [Error 1: Custom Nginx Config Not Copied in Dockerfile (404 Not Found)](#error-1-custom-nginx-config-not-copied-in-dockerfile-404-not-found)
3. [Error 2: 504 Gateway Timeout on API Calls](#error-2-504-gateway-timeout-on-api-calls)
4. [Error 3: Host Not Found in Upstream "host.docker.internal"](#error-3-host-not-found-in-upstream-hostdockerinternal)
5. [Error 4: Vite CommonJS/ESM Build Warning](#error-4-vite-commonjsesm-build-warning)
6. [Complete Solution & Recommended Workflow](#-complete-solution--recommended-workflow)

---

## 🔍 Overview of Issues

| # | Issue / Error | Location | Root Cause | Fix Summary |
|---|---|---|---|---|
| 1 | **404 Not Found** on `/api/*` & SPA routes | `frontend/Dockerfile` | `nginx.conf` was missing from `Dockerfile` build steps | Added `COPY nginx.conf /etc/nginx/conf.d/default.conf` |
| 2 | **504 Gateway Timeout** on `/api/auth/login` | `frontend/nginx.conf` | Linux host firewall (UFW) blocked container requests to `172.17.0.1` | Used Docker Network / Compose with service DNS (`http://backend:5000`) |
| 3 | **`host not found in upstream "host.docker.internal"`** | Linux Docker Runtime | Linux Docker does not resolve `host.docker.internal` without `--add-host` | Used `docker-compose.yml` or `--add-host=host.docker.internal:host-gateway` |
| 4 | **Vite build warning** (`configLoader: native`) | `frontend/package.json` | Package type set to `"commonjs"` instead of `"module"` | Changed `"type": "commonjs"` to `"type": "module"` |

---

## Error 1: Custom Nginx Config Not Copied in Dockerfile (404 Not Found)

### ❌ Problem Description
- React SPA page reloads or direct navigations (`/login`, `/dashboard`) returned **Nginx 404 Not Found**.
- Requests sent to `/api/auth/login` were treated as missing static files (`/usr/share/nginx/html/api/auth/login`) and failed with **404 Not Found**.

### 📍 Where It Occurred
`frontend/Dockerfile`

### 💡 Root Cause
`frontend/nginx.conf` existed in the project, but the `Dockerfile` was only copying the built HTML/JS static files from the build stage, neglecting to copy `nginx.conf` into `/etc/nginx/conf.d/default.conf`. Nginx ran with its default stock config.

### 🛠️ Solution & Code Fix
Update `frontend/Dockerfile` to copy `nginx.conf`:

```dockerfile
# BUILD STAGE
FROM node:20-alpine as builder
WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .
RUN npm run build

# PRODUCTION STAGE
FROM nginx:alpine

# Copy static frontend build output
COPY --from=builder /app/dist /usr/share/nginx/html

# COPY CUSTOM NGINX CONFIGURATION (Reverse Proxy + SPA routing)
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

---

## Error 2: 504 Gateway Timeout on API Calls

### ❌ Problem Description
When submitting the login form, the browser console showed:
`Failed to load resource: the server responded with a status of 504 (Gateway Timeout) - /api/auth/login`

### 📍 Where It Occurred
`frontend/nginx.conf` (`proxy_pass http://172.17.0.1:5000;`)

### 💡 Root Cause
Hardcoding `172.17.0.1` (Linux Docker bridge IP) inside container Nginx config fails because Linux UFW/iptables firewall rules block incoming packets sent from inside Docker containers back to the host bridge IP. Nginx waited 60 seconds for a response before timing out.

### 🛠️ Solution & Code Fix
Instead of relying on fragile host IPs, use Docker container service DNS:

Update `frontend/nginx.conf`:
```nginx
server {
    listen 80;
    server_name localhost;

    location / {
        root /usr/share/nginx/html;
        index index.html index.htm;
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        # Forward requests to backend container using service name
        proxy_pass http://backend:5000;

        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## Error 3: Host Not Found in Upstream "host.docker.internal"

### ❌ Problem Description
When starting the frontend container, Nginx crashed instantly with error log:
`2026/09/02 06:24:31 [emerg] 1#1: host not found in upstream "host.docker.internal" in /etc/nginx/conf.d/default.conf:12`

### 📍 Where It Occurred
Linux Docker container execution (`docker run -p 8000:80 napp-frontend:latest`)

### 💡 Root Cause
Unlike Docker Desktop on Mac/Windows, Linux Docker Engine does **not** map `host.docker.internal` inside containers by default. Nginx fails DNS resolution on startup and exits immediately.

### 🛠️ Solution & Code Fix

#### Method A: Using Docker Compose (Recommended)
Use `docker-compose.yml` so Docker automatically sets up internal DNS resolution between containers.

#### Method B: Standalone `docker run` with `--add-host`
If running standalone containers without Compose, pass the `--add-host` flag:
```bash
docker run -d -p 8000:80 --add-host=host.docker.internal:host-gateway --name napp-frontend-container napp-frontend:latest
```

---

## Error 4: Vite CommonJS/ESM Build Warning

### ❌ Problem Description
During `docker build`:
`Your Vite config uses features that are unsupported by configLoader: 'native' ... Use a .mjs extension or set "type": "module" in package.json`

### 📍 Where It Occurred
`frontend/package.json`

### 💡 Root Cause
`package.json` was set to `"type": "commonjs"`, but `vite.config.ts` uses ES Module syntax (`import`/`export`).

### 🛠️ Solution & Code Fix
Update `frontend/package.json`:
```json
{
  "name": "frontend",
  "version": "1.0.0",
  "type": "module"
}
```

---

## ⚡ Complete Solution & Recommended Workflow

### 1. Orchestrate with `docker-compose.yml` (Root Directory)

Create `docker-compose.yml` in the project root:

```yaml
version: '3.8'

services:
  backend:
    build: ./backend
    container_name: napp-backend
    ports:
      - "5000:5000"
    environment:
      - PORT=5000
      - MONGODB_URI=mongodb+srv://nasir:nasir@practice.sjezdnr.mongodb.net/
      - JWT_SECRET=your_jwt_secret_key_change_in_production
    restart: always

  frontend:
    build: ./frontend
    container_name: napp-frontend
    ports:
      - "8000:80"
    depends_on:
      - backend
    restart: always
```

### 2. How to Run the Fixed Application

Execute a single command to build and launch both services:

```bash
# Navigate to project root
cd "/home/nasir/Desktop/Notes App"

# Build and start containers
docker compose up --build
```

### 3. Verification

1. Open browser to **`http://localhost:8000`**.
2. Navigate to `/login` or `/register` (SPA routing verified).
3. Submit login details (API Reverse Proxy to `http://backend:5000/api/auth/login` verified without 504 Timeout).

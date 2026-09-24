# Stage 1: Build stage
FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Final Production Stage (Nginx)
FROM nginx:alpine

# Yeh line final production image ke packages ko upgrade karegi aur vulnerabilities zero karegi
RUN apk update && apk upgrade --no-cache

# Build files ko transfer karein
COPY --from=builder /app/dist /usr/share/nginx/html

# Custom Nginx configuration (Reverse Proxy + SPA routing)
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

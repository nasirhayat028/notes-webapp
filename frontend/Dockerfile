# =========================
# Stage 1: Build React app
# =========================
FROM node:22-alpine AS build

WORKDIR /app

# Copy package files first
COPY package*.json ./

# Install exact dependencies from package-lock.json
RUN npm ci

# Copy the rest of the application
COPY . .

# Create production build
RUN npm run build


# =========================
# Stage 2: Nginx web server
# =========================
FROM nginx:alpine

# Remove default nginx website
RUN rm -rf /usr/share/nginx/html/*

# Copy React production build
COPY --from=build /app/dist /usr/share/nginx/html

# Copy our nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

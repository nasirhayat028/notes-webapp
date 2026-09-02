#BUILD STAGE
FROM node:20-alpine as builder

WORKDIR /app

COPY package.json ./

RUN npm install

COPY . .

RUN npm run build

#PRODUCTION STAGE
FROM nginx:alpine

# Copy built static assets
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom Nginx configuration (Reverse Proxy + SPA routing)
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]


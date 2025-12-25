# Stage 1: Build
FROM node:20-alpine AS build

WORKDIR /app

# Dependencies installieren
COPY package*.json ./
RUN npm ci

# Source kopieren und bauen
COPY . .
RUN npm run build

# Stage 2: Production
FROM nginx:alpine

# Build-Output kopieren
COPY --from=build /app/dist /usr/share/nginx/html

# Nginx-Config für SPA (Single Page App)
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

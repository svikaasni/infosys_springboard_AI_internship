# Intelligent Bug Diagnosis Platform with Fix Recommendation Assistance — frontend image
# Stage 1: build the static Vite bundle
FROM node:20-slim AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# Stage 2: serve the built assets with nginx, proxying /api to the backend
# container so the frontend never needs to know the backend's real address
# at build time — same pattern as the Vite dev-server proxy used locally.
FROM nginx:1.27-alpine

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

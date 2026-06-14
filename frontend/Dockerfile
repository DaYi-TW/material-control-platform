# ---- build stage ----
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# VITE_API_BASE_URL is baked in at build time (browser calls the backend, not the
# container). It's a public value, so the default is the deployed backend URL — Zeabur
# does not reliably pass dashboard vars as --build-arg, and a wrong default silently
# bakes localhost into the bundle. Override with --build-arg for other environments.
ARG VITE_API_BASE_URL=https://material-api-d1.zeabur.app
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN npm run build

# ---- runtime stage ----
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
# Zeabur 慣例:容器須監聽注入的 $PORT(預設 8080),否則路由不到 → 502。
# 把 nginx 設定寫成模板,啟動時用 envsubst 把 $PORT 套進去再啟動。
# SPA fallback(try_files → index.html)讓前端路由 / 重整可用。
RUN printf 'server {\n  listen ${PORT};\n  location / {\n    root /usr/share/nginx/html;\n    try_files $uri $uri/ /index.html;\n  }\n}\n' > /etc/nginx/default.conf.template
ENV PORT=8080
EXPOSE 8080
# 只替換 $PORT(保留 nginx 的 $uri);放在非 /etc/nginx/templates 以免被官方 entrypoint 重複處理。
CMD ["sh", "-c", "envsubst '$PORT' < /etc/nginx/default.conf.template > /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'"]

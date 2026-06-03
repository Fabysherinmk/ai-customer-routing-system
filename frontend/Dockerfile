FROM node:20-alpine AS builder

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm ci --legacy-peer-deps

COPY . .

RUN npm run build

FROM nginx:1.25-alpine

COPY --from=builder /usr/src/app/dist /usr/share/nginx/html

# Copy custom Nginx configuration to support SPA routing (React Router fallback to index.html)
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

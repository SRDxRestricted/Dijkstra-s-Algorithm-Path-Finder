# Stage 1: Build the React frontend
FROM node:18-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Stage 2: Set up the Express backend
FROM node:18-alpine AS backend-runner
WORKDIR /app
COPY backend/package*.json ./backend/
RUN npm install --prefix backend --only=production
COPY backend/ ./backend/

# Copy the built frontend static assets into the backend folder
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

EXPOSE 8080
ENV PORT=8080
ENV NODE_ENV=production

CMD ["npm", "start", "--prefix", "backend"]

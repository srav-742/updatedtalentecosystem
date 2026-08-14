# Multi-stage production build for Hire1Percent microservices
# Note: Run docker build from the monorepo root:
# docker build -t job-service -f services/job-service/Dockerfile .

FROM node:22-alpine AS builder
WORKDIR /usr/src/app

# Copy and install shared library first
COPY packages/shared /usr/src/packages/shared
RUN cd /usr/src/packages/shared && npm ci

# Copy the service specific package files
COPY services/job-service/package*.json ./
RUN npm ci --only=production

# Copy remaining source code
COPY services/job-service/ ./

EXPOSE 5000
CMD ["npm", "start"]

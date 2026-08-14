FROM node:18-alpine AS builder

WORKDIR /usr/src/app

COPY package*.json ./
COPY packages/shared ./packages/shared

WORKDIR /usr/src/app/services/resume-service
COPY services/resume-service/package*.json ./
RUN npm ci

COPY services/resume-service ./

FROM node:18-alpine

WORKDIR /usr/src/app

COPY --from=builder /usr/src/app/packages/shared ./packages/shared
COPY --from=builder /usr/src/app/services/resume-service ./services/resume-service

WORKDIR /usr/src/app/services/resume-service

ENV NODE_ENV=production
ENV PORT=5008

EXPOSE 5008

CMD ["npm", "start"]

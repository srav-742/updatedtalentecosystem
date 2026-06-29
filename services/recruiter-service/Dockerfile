FROM node:18-alpine AS builder

WORKDIR /usr/src/app

COPY package*.json ./
COPY packages/shared ./packages/shared

WORKDIR /usr/src/app/services/recruiter-service
COPY services/recruiter-service/package*.json ./
RUN npm ci

COPY services/recruiter-service ./

FROM node:18-alpine

WORKDIR /usr/src/app

COPY --from=builder /usr/src/app/packages/shared ./packages/shared
COPY --from=builder /usr/src/app/services/recruiter-service ./services/recruiter-service

WORKDIR /usr/src/app/services/recruiter-service

ENV NODE_ENV=production
ENV PORT=5004

EXPOSE 5004

CMD ["npm", "start"]

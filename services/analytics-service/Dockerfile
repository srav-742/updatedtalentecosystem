FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
COPY ../../packages/shared ../../packages/shared
RUN npm ci --omit=dev

COPY src ./src

EXPOSE 5015

CMD ["npm", "start"]

FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

# Ensure OpenSSL for Prisma engines
RUN apk add --no-cache openssl

RUN npm install --include=dev

COPY . .

RUN npx prisma generate || true

EXPOSE 4010

CMD ["sh","-c","npx prisma db push --accept-data-loss && node src/server.js"]

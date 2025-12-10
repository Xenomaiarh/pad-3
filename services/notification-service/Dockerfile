FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

# Ensure OpenSSL for Prisma engines
RUN apk add --no-cache openssl

# Install all dependencies (include dev) so prisma CLI is available
RUN npm install

COPY . .

# Generate Prisma client
RUN npx prisma generate

EXPOSE 4004

CMD ["sh","-c","npx prisma db push --accept-data-loss && node src/server.js"]
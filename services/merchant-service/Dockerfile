FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

# Ensure OpenSSL for Prisma engines
RUN apk add --no-cache openssl

# Install all deps for prisma CLI
RUN npm install --include=dev

COPY . .

# Generate Prisma client
RUN npx prisma generate || true

EXPOSE 4005

CMD ["sh","-c","npx prisma db push --accept-data-loss && node src/server.js"]
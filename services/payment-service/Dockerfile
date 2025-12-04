FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install --include=dev

COPY . .

RUN npx prisma generate || true

EXPOSE 4008

CMD ["sh","-c","npx prisma migrate deploy && node src/server.js"]

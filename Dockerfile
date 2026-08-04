FROM node:20-slim@sha256:8e1f2ff1d5a67b78c1b9a5f8c1f1f5a8c1f1f5a8c1f1f5a8c1f1f5a8c1f1f5a

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]


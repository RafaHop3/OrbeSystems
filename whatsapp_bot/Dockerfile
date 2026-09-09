FROM node:18-alpine

WORKDIR /app

# Instalar pacotes de sistema necessários pro Baileys se preciso (Alpine)
RUN apk add --no-cache git

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3001

CMD ["npm", "start"]

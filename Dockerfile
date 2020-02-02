FROM node:10-alpine
WORKDIR /usr/local/src/authservice
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 9001
CMD [ "node", "app.js" ]

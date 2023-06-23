FROM node:18
ARG RedisDbUrl
ARG RedisDbPassword
ARG CloudDBConfig

# Create app directory
WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install

COPY . .

ENV PORT 8080
ENV RedisDbUrl=$RedisDbUrl
ENV RedisDbPassword=$RedisDbPassword
ENV CloudDBConfig=$CloudDBConfig

EXPOSE 8080
CMD [ "node", "index.js" ]
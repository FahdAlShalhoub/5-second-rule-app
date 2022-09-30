const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const {Server} = require("socket.io");
const io = new Server(server);
const redis = require("redis");
const redisAdapter = require("@socket.io/redis-adapter");
const port = process.env.PORT || 6000;
const redisDbUrl = process.env.RedisDbUrl;
const redidDbPassword = process.env.RedisDbPassword;

io.on('connection', (socket) => {
    socket.emit('helloo', "لككلكلكلكلكلككلك مرحب الصبايا");
});

const pubClient = redis.createClient({
    url: redisDbUrl,
    password: redidDbPassword
});
const subClient = pubClient.duplicate();

Promise.all([pubClient.connect(), subClient.connect()]).then(() => {
    io.adapter(redisAdapter.createAdapter(pubClient, subClient));
    io.listen(3000);
});

server.listen(port, () => {
    console.log('Server Started');
});

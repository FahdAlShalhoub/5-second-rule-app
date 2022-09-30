const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);

io.on('connection', (socket) => {
    socket.on('chat message', (msg) => {
        console.log('message: ' + msg);
    });
});

server.listen(process.env.PORT || 5000, () => {
    console.log('Server Started');
});

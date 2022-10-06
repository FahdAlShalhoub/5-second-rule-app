const {Server} = require("socket.io");
const redis = require("redis");
const redisAdapter = require("@socket.io/redis-adapter");

module.exports = (server, redisOptions) => {
    const pubClient = redis.createClient(redisOptions);
    const subClient = pubClient.duplicate();

    Promise.all([pubClient.connect(), subClient.connect()]).then(() => {
        io.adapter(redisAdapter.createAdapter(pubClient, subClient));
        io.listen(3000);
    });

    const io = new Server(server);

    io.on('connection', (socket) => {
        socket.on("hello", (msg) => {
            socket.emit("som", "Kill the child")
            console.log(msg)
        })
    });

    return io;
}


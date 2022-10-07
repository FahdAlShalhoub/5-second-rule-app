const {Server} = require("socket.io");
const redis = require("redis");
const redisAdapter = require("@socket.io/redis-adapter");

module.exports = (server, redisOptions) => {
    const pubClient = redis.createClient(redisOptions);
    const subClient = pubClient.duplicate();

    const io = new Server(server);

    Promise.all([pubClient.connect(), subClient.connect()]).then(() => {
        io.adapter(redisAdapter.createAdapter(pubClient, subClient));
        io.listen(3000);
    });

    return io;
}


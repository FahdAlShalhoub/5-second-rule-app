const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const {Server} = require("socket.io");
const io = new Server(server);
const redis = require("redis");
const redisAdapter = require("@socket.io/redis-adapter");
const port = process.env.PORT || 5100;
const redisDbUrl = process.env.RedisDbUrl
const redidDbPassword = process.env.RedisDbPassword
const sentryDsn = process.env.SentryDsn
const RoomRoutes = require("./src/Routes");
const RoomManager = require("./src/RoomManager");
const Sentry = require("@sentry/node");
const Tracing = require("@sentry/tracing");

io.on('connection', (socket) => {
    socket.on("helloo", (msg) => {
        console.log(msg)
    })
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

Sentry.init({
    dsn: sentryDsn,
    integrations: [
        // enable HTTP calls tracing
        new Sentry.Integrations.Http({ tracing: true }),
        // enable Express.js middleware tracing
        new Tracing.Integrations.Express({ app }),
    ],

    // Set tracesSampleRate to 1.0 to capture 100%
    // of transactions for performance monitoring.
    // We recommend adjusting this value in production
    tracesSampleRate: 1.0,
});

app.use(express.json());

app.use(Sentry.Handlers.requestHandler());
app.use(Sentry.Handlers.tracingHandler());

app.use(
    Sentry.Handlers.errorHandler({
        shouldHandleError(error) {
            return error.status === 500;
        }
    })
);

app.post(RoomRoutes.CreateRoom, (req, res, next) => {
    RoomManager.generateRoom(req.body)
        .then(response => res.send(JSON.stringify(response)))
        .catch(next)
});

app.post(RoomRoutes.JoinRoom, (req, res, next) => {
    RoomManager.joinRoom(req.body, req.params.roomId)
        .then(response => res.send(JSON.stringify(response)))
        .catch(next)
});

app.use((err, req, res, next) => {
    console.error(err.stack)
    res.status(500).send(toProblemDetails(err, res))
})

const toProblemDetails = (err, res) => {
    res.set("Content-Type", "application/problem+json")
    res.set("Content-Language", "ar")
    return {
        type: "about:content",
        title: err.message,
        details: err.message,
        instance: ""
    }
}

server.listen(port, () => {
    console.log(`Server Started At Port: ${port}`);
});

const express = require('express');
const http = require('http');
const Sentry = require("@sentry/node");
const Tracing = require("@sentry/tracing");
const RoomsRouter = require("./src/RoomsRouter");

const app = express();
const server = http.createServer(app);
const ApiError = require("./src/Errors/ApiError");
const port = process.env.PORT || 5100;
const sentryDsn = process.env.SentryDsn
const redisDbUrl = process.env.RedisDbUrl
const redidDbPassword = process.env.RedisDbPassword
const roomsRepository = require("./src/Repositories/InMemoryRoomRepository")([]);
const io = require("./src/SocketIoServer")(server, {url: redisDbUrl, password: redidDbPassword});
const RoomManager = require("./src/RoomManager")(roomsRepository);

Sentry.init({
    dsn: sentryDsn,
    environment: process.env.NODE_ENV,
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

//Middleware
app.use(express.json());
app.use(Sentry.Handlers.requestHandler());
app.use(Sentry.Handlers.tracingHandler());

// Routes
app.use("/v1/room", RoomsRouter(RoomManager, io))

app.use(
    Sentry.Handlers.errorHandler({
        shouldHandleError(error) {
            return error.status === 500;
        }
    })
);

app.use((err, req, res, next) => {
    if (err instanceof ApiError) {
        res.status(err.statusCode).send(toProblemDetails(err, res))
    } else {
        console.error(err.stack)
        Sentry.captureException(err);
        res.status(500).send(toProblemDetails({...err, message: "Something Went Wrong"}, res))
    }
})

const toProblemDetails = (err, res) => {
    res.set("Content-Type", "application/problem+json")
    res.set("Content-Language", "ar")
    return {
        type: "about:blank",
        title: err.message,
        details: err.message,
        instance: ""
    }
}

server.listen(port, () => {
    console.log(`Server Started At Port: ${port}`);
});

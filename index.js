const express = require('express');
const http = require('http');
const Sentry = require("@sentry/node");
const Tracing = require("@sentry/tracing");
const RoomsRouter = require("./src/RoomsRouter");

const app = express();
const server = http.createServer(app);
const ApiError = require("./src/Errors/ApiError");
const RoomEvents = require("./src/RoomEvents");
const GameEvents = require("./src/GameEvents");
const port = process.env.PORT || 5100;
const sentryDsn = process.env.SentryDsn
const redisDbUrl = process.env.RedisDbUrl
const redidDbPassword = process.env.RedisDbPassword
const io = require("./src/SocketIoServer").startServer(server, {url: redisDbUrl, password: redidDbPassword});

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

console.log("Loading Questions Cache...")
require("./src/Repositories/CloudDbRoomRepository")
    .getQuestions()
    .then(questions => {
        console.log("Loaded Questions Cache Successfully")
        const roomsRepository = require("./src/Repositories/InMemoryRoomRepository")([], [], questions);
        const RoomManager = require("./src/RoomManager")(roomsRepository);
        const GameSession = require("./src/GameSession")(roomsRepository);

        // Routes
        app.use("/v1/room", RoomsRouter(RoomManager, io))

        io.on("connection", (socket) => {
            console.log(socket.id)
            socket.on(RoomEvents.received.START_GAME, (arg, callback) => {
                console.log(arg)
                let x = arg
                let categories;
                x = x.replace("]", "")
                x = x.replace("[", "")

                const p = arg.split(",")

                if(p.length !== 1) {
                    const firstElement = p.shift().trim()
                    const lastElement = p.pop().trim()

                    categories = [firstElement, ...p.map(str => str.trim()), lastElement]
                } else {
                    categories = [x]
                }

                RoomManager.initiateGame(io)(Array.from(socket.rooms)[1], categories)
                    .then((game) => callback(game))
                    .catch(err => callback(ApiError.toProblemDetails(err)))
            })

            socket.on(GameEvents.received.TIME_RAN_OUT, (arg1, arg2, callback) => {
                GameSession.timeRanOut(io)(arg1, Array.from(socket.rooms)[1], arg2)
                    .then(game => callback(game))
                    .catch(err => callback(ApiError.toProblemDetails(err)))
            })

            socket.on(GameEvents.received.QUESTION_ANSWERED, (arg) => {
                console.log(arg)
                GameSession.questionAnswered(io)(arg)
            })

            socket.on(RoomEvents.received.KICK_ME, (arg) => {
                RoomManager.initiateGame(io)(Array.from(socket.rooms)[1], arg)
            })
        });

        app.use(
            Sentry.Handlers.errorHandler({
                shouldHandleError(error) {
                    return error.status === 500;
                }
            })
        );

        app.use((err, req, res, next) => {
            res.set("Content-Type", "application/problem+json")
            res.set("Content-Language", "ar")

            if (err instanceof ApiError) {
                res.status(err.statusCode).send(ApiError.toProblemDetails(err))
            } else {
                console.error(err.stack)
                Sentry.captureException(err);
                res.status(500).send(ApiError.toProblemDetails({...err, message: "Something Went Wrong"}, res))
            }
        })

        server.listen(port, () => {
            console.log(`Server Started At Port: ${port}`);
        });
    })

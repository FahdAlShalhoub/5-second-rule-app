const express = require('express');
const http = require('http');
const app = express();
const server = http.createServer(app);
const port = process.env.PORT || 5100;
const redisDbUrl = process.env.RedisDbUrl
const redidDbPassword = process.env.RedisDbPassword
const ApiError = require("./src/Errors/ApiError");
const RoomEvents = require("./src/RoomEvents");
const GameEvents = require("./src/GameEvents");
const {parseCategories} = require("./src/Utils");
const RoomsRouter = require("./src/RoomsRouter");
const io = require("./src/SocketIoServer").startServer(server, {url: redisDbUrl, password: redidDbPassword});

//Middleware
app.use(express.json());

const repo = require("./src/Repositories/CloudDbRoomRepository");


console.log("Loading Cache....")
Promise.all([repo.getQuestions(), repo.getCategories()])
    .then(([questions, categories]) => {
        console.log("Loaded Cache Successfully")

        const roomsRepository = require("./src/Repositories/InMemoryRoomRepository")([], [], questions, categories);
        const RoomManager = require("./src/RoomManager")(roomsRepository);
        const GameSession = require("./src/GameSession")(roomsRepository);

        // Routes
        app.use("/v1/room", RoomsRouter(RoomManager, io))

        io.on("connection", (socket) => {
            socket.on(RoomEvents.received.START_GAME, (arg, callback) => {
                RoomManager.initiateGame(io)(Array.from(socket.rooms)[1], parseCategories(arg))
                    .then((game) => callback(game))
                    .catch(err => callback(ApiError.toProblemDetails(err)))
            })

            socket.on(GameEvents.received.TIME_RAN_OUT, (arg1, arg2, callback) => {
                GameSession(io).timeRanOut(arg1, Array.from(socket.rooms)[1], arg2)
                    .then(game => callback(game))
                    .catch(err => callback(ApiError.toProblemDetails(err)))
            })

            socket.on(GameEvents.received.QUESTION_ANSWERED, (arg) => {
                console.log(arg)
                GameSession(io).questionAnswered(arg)
            })

            socket.on(RoomEvents.received.KICK_ME, (arg) => {
                RoomManager.initiateGame(io)(Array.from(socket.rooms)[1], arg)
            })
        });

        // app.use(
        //     Sentry.Handlers.errorHandler({
        //         shouldHandleError(error) {
        //             return error.status === 500;
        //         }
        //     })
        // );

        app.use((err, req, res, next) => {
            res.set("Content-Type", "application/problem+json")
            res.set("Content-Language", "ar")

            if (err instanceof ApiError) {
                res.status(err.statusCode).send(ApiError.toProblemDetails(err))
            } else {
                console.error(err.stack)
                // Sentry.captureException(err);
                res.status(500).send(ApiError.toProblemDetails({...err, message: "Something Went Wrong"}, res))
            }
        })

        server.listen(port, () => {
            console.log(`Server Started At Port: ${port}`);
        });
    })

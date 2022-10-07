const express = require('express')
const ApiError = require("./Errors/ApiError");
const router = express.Router()
const RoomRoutes = {
    CreateRoom: "/",
    JoinRoom: "/:roomId/players"
}

module.exports = (RoomManager, io) => {
    router.post(RoomRoutes.CreateRoom, (req, res, next) => {
        RoomManager.generateRoom(io)(req.body)
            .then(response => res.send(response))
            .catch(next)
    });

    router.post(RoomRoutes.JoinRoom, (req, res, next) => {
        RoomManager.joinRoom(io)(req.body, req.params.roomId)
            .then(response => res.send(response))
            .catch(next)
    });

    io.on("connection", (socket) => {
        console.log(socket.id)
        socket.on("start_game", (arg, callback) => {
            RoomManager.startGame(io)(Array.from(socket.rooms)[1], arg.categories)
                .then((game) => {
                    callback(game)
                })
                .catch(err => {
                    callback(ApiError.toProblemDetails(err))
                })
        })
    });

    return router
}

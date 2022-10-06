const express = require('express')
const router = express.Router()
const RoomRoutes = {
    CreateRoom: "/",
    JoinRoom: "/:roomId/players"
}

module.exports = (RoomManager) => {
    router.post(RoomRoutes.CreateRoom, (req, res, next) => {
        RoomManager.generateRoom(req.body)
            .then(response => res.send(response))
            .catch(next)
    });

    router.post(RoomRoutes.JoinRoom, (req, res, next) => {
        RoomManager.joinRoom(req.body, req.params.roomId)
            .then(response => res.send(response))
            .catch(next)
    });

    return router
}

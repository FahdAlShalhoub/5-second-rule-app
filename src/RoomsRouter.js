const express = require('express')
const RoomManager = require("./RoomManager");
const router = express.Router()
const roomsRepository = require("../tests/InMemoryRepositories/InMemoryRoomRepository")([]);

const RoomRoutes = {
    CreateRoom: "/",
    JoinRoom: "/:roomId/players"
}

router.post(RoomRoutes.CreateRoom, (req, res, next) => {
    RoomManager.generateRoom(req.body, roomsRepository)
        .then(response => res.send(response))
        .catch(next)
});

router.post(RoomRoutes.JoinRoom, (req, res, next) => {
    RoomManager.joinRoom(req.body, req.params.roomId, roomsRepository)
        .then(response => res.send(response))
        .catch(next)
});

module.exports = router

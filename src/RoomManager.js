const {faker} = require('@faker-js/faker');
const ApiError = require("./Errors/ApiError");
const HttpStatusCode = require("./HttpStatusCode");
const RoomStatus = require("./RoomStatuses");

module.exports = (repository, socketManager) => ({
    generateRoom: (host) => new Promise((resolve, reject) => {
        repository.getActiveRoomByHostId(host.hostId)
            .then(room => ensureHostHasNoActiveRoom(room))
            .then(() => generateRoom(host))
            .then(room => addRoom(repository)(room))
            .then(room => addPlayerToSocketRoom(socketManager)(host.hostId, room))
            .then(resolve)
            .catch(reject)
    }),

    joinRoom: (player, roomId) => new Promise((resolve, reject) => {
        repository.getActiveRoomById(roomId)
            .then(room => ensureRoomExists(room))
            .then(room => addPlayerToRoom(room, player))
            .then(room => updateRoom(repository)(room))
            .then(room => addPlayerToSocketRoom(socketManager)(player.playerId, room))
            .then(room => emitPlayerJoinedEventToRoom(socketManager)(room))
            .then(resolve)
            .catch(reject)
    })
});

const generateRoom = (host) => {
    return {
        host,
        players: [{playerName: host.hostName, playerId: host.hostId}],
        roomId: faker.random.words(3).replace(new RegExp(" ", 'g'), "-"),
        roomStatus: RoomStatus.Active
    }
}

const ensureHostHasNoActiveRoom = (existingRoom) => {
    if (existingRoom) {
        throw new ApiError("Host Already Has Room", HttpStatusCode.BadRequest)
    }
}

const addPlayerToSocketRoom = (socketManager) => (socketId, room) => {
    socketManager.in(socketId).socketsJoin(room.roomId)
    return room;
}

const ensureRoomExists = room => {
    if (!room) throw new ApiError("Room Does Not Exist", HttpStatusCode.BadRequest)
    return room;
};

const addPlayerToRoom = (room, player) => {
    room.players.push(player)
    return room;
};

const emitPlayerJoinedEventToRoom = (socketManager) => (room) => {
    socketManager.to(room.roomId).emit("player_joined", room)
    return room
}

const updateRoom = (repository) => (room) => {
    return repository.updateRoom(room)
}

const addRoom = (repository) => (room) => {
    return repository.addRoom(room)
}

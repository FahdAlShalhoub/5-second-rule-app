const {faker} = require('@faker-js/faker');
const ApiError = require("./Errors/ApiError");
const HttpStatusCode = require("./HttpStatusCode");
const RoomStatus = require("./RoomStatuses");

module.exports = (repository, socketManager) => ({
    generateRoom: (host) =>
        repository.getActiveRoomByHostId(host.hostId)
            .then(room => ensureHostHasNoActiveRoom(room))
            .then(() => generateRoom(host))
            .then(room => addRoom(repository)(room))
            .then(room => addPlayerToSocketRoom(socketManager)(host.hostId, room)),

    joinRoom: (player, roomId) =>
        repository.getActiveRoomById(roomId)
            .then(room => ensureRoomExists(room))
            .then(room => addPlayerToRoom(room, player))
            .then(room => updateRoom(repository)(room))
            .then(room => addPlayerToSocketRoom(socketManager)(player.playerId, room))
            .then(room => emitEventToSocketRoom(socketManager)("player_joined", room))
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

const emitEventToSocketRoom = (socketManager) => (eventName, room) => {
    socketManager.to(room.roomId).emit(eventName, room)
    return room
}

const updateRoom = (repository) => (room) => {
    return repository.updateRoom(room)
}

const addRoom = (repository) => (room) => {
    return repository.addRoom(room)
}

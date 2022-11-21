const {faker} = require('@faker-js/faker');
const ApiError = require("./Errors/ApiError");
const HttpStatusCode = require("./HttpStatusCode");
const RoomStatus = require("./RoomStatuses");
const RoomEvents = require("./RoomEvents");
const GameSession = require("./GameSession");
const SocketIoServer = require("./SocketIoServer");

module.exports = (repository) => ({
    generateRoom: (io) => (host) =>
        repository.getActiveRoomByHostId(host.hostId)
            .then(room => ensureHostHasNoActiveRoom(room))
            .then(() => generateRoom(host))
            .then(room => addRoom(repository)(room))
            .then(room => addPlayerToSocketRoom(io)(host.hostId, room)),

    joinRoom: (io) => (player, roomId) =>
        repository.getActiveRoomById(roomId)
            .then(room => ensureExists(room, "Room Does Not Exist"))
            .then(room => addPlayerToRoom(room, player))
            .then(room => updateRoom(repository)(room))
            .then(room => addPlayerToSocketRoom(io)(player.playerId, room))
            .then(room => notifyRoomPlayersOfNewPlayer(io)(room)),

    initiateGame: (io) => (roomId, categories) =>
        repository.getActiveRoomById(roomId)
            .then(room => ensureExists(room, "Room Does Not Exist"))
            .then(room => ensureRoomHasEnoughPlayers(room))
            .then(room => GameSession(repository)(io).startGame(room, categories))
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

const ensureExists = (obj, errorMessage) => {
    if (!obj) throw new ApiError(errorMessage, HttpStatusCode.BadRequest)
    return obj;
};

const ensureRoomHasEnoughPlayers = room => {
    if (room.players.length < 2)
        throw new ApiError("Room Does Not Have Enough Players", HttpStatusCode.BadRequest)
    return room
};

const addPlayerToRoom = (room, player) => {
    return {
        ...room,
        players: [...room.players.filter(playerInRoom => player.playerId !== playerInRoom.playerId), player]
    };
};

const addPlayerToSocketRoom = (socketManager) => (socketId, room) => {
    SocketIoServer.addClientToSocketRoom(socketManager)(socketId, room.roomId)
    return room;
}

const notifyRoomPlayersOfNewPlayer = (socketManager) => (room) => {
    SocketIoServer.emitEventToSocketRoom(socketManager)(RoomEvents.sent.PLAYER_JOINED, room)
    return room
}

const updateRoom = (repository) => (room) => {
    return repository.updateRoom(room)
}

const addRoom = (repository) => (room) => {
    return repository.addRoom(room)
}

const {faker} = require('@faker-js/faker');
const ApiError = require("./Errors/ApiError");
const HttpStatusCode = require("./HttpStatusCode");
const RoomStatus = require("./RoomStatuses");
const {v4: uuid} = require('uuid');
const RoomEvents = require("./RoomEvents");

module.exports = (repository) => ({
    generateRoom: (io) => (host) =>
        repository.getActiveRoomByHostId(host.hostId)
            .then(room => ensureHostHasNoActiveRoom(room))
            .then(() => generateRoom(host))
            .then(room => addRoom(repository)(room))
            .then(room => addPlayerToSocketRoom(io)(host.hostId, room)),

    joinRoom: (io) => (player, roomId) =>
        repository.getActiveRoomById(roomId)
            .then(room => ensureRoomExists(room))
            .then(room => addPlayerToRoom(room, player))
            .then(room => updateRoom(repository)(room))
            .then(room => addPlayerToSocketRoom(io)(player.playerId, room))
            .then(room => emitEventToSocketRoom(io)(RoomEvents.sent.PLAYER_JOINED, room)),

    startGame: (io) => (roomId, categories) =>
        repository.getActiveRoomById(roomId)
            .then(room => ensureRoomExists(room))
            .then(room => ensureRoomHasEnoughPlayers(room))
            .then(room => generateGame(room, categories))
            .then(game => nextTurn(game))
            .then(game => addGame(repository)(game))
            .then(game => emitEventToSocketRoom(io)(RoomEvents.sent.GAME_STARTED, game))
            .then(game => startCurrentPlayerTurn(io)(repository)(game)),

    questionAnswered: (io) => (gameId) =>
        repository.getGameById(gameId)
            .then(game => nextTurn(game))
            .then(game => startCurrentPlayerTurn(io)(repository)(game))
            .then(game => updateGame(game)),

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

const ensureRoomExists = room => {
    if (!room) throw new ApiError("Room Does Not Exist", HttpStatusCode.BadRequest)
    return room;
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

const emitEventToSocketRoom = (socketManager) => (eventName, room) => {
    socketManager.to(room.roomId).emit(eventName, room)
    return room
}

const addPlayerToSocketRoom = (socketManager) => (socketId, room) => {
    socketManager.in(socketId).socketsJoin(room.roomId)
    return room;
}

const updateRoom = (repository) => (room) => {
    return repository.updateRoom(room)
}

const addRoom = (repository) => (room) => {
    return repository.addRoom(room)
}

const addGame = (repository) => (game) => {
    return repository.addGame(game)
}

const updateGame = (repository) => (game) => {
    return repository.updateGame(game)
}

const generateGame = (room, categories) => ({
    gameId: uuid(),
    roomId: room.roomId,
    numberOfTries: 3,
    categories,
    currentPlayer: {...room.players[0], remainingTries: 3, failedTries: []},
    players: room.players.map(player => ({...player, remainingTries: 3, failedTries: []}))
});

const startCurrentPlayerTurn = io => repository => game => {
    const questions = repository.getAllQuestions()
    const question = questions[Math.floor(Math.random() * questions.length)];
    setTimeout(() => {
        io.in(game.currentPlayer.playerId).emit(RoomEvents.sent.YOUR_TURN, question.question);
    }, 3000)
    return game;
};

const nextTurn = game => {
    const indexOfCurrentPlayer = game.players.findIndex(player => player.playerId === game.currentPlayer.playerId);
    game.currentPlayer = indexOfCurrentPlayer + 1 >= game.players.length ? game.players[0] : game.players[indexOfCurrentPlayer + 1];
    return game;
};

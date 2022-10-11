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
            .then(room => ensureExists(room, "Room Does Not Exist"))
            .then(room => addPlayerToRoom(room, player))
            .then(room => updateRoom(repository)(room))
            .then(room => addPlayerToSocketRoom(io)(player.playerId, room))
            .then(room => emitEventToSocketRoom(io)(RoomEvents.sent.PLAYER_JOINED, room)),

    startGame: (io) => (roomId, categories) =>
        repository.getActiveRoomById(roomId)
            .then(room => ensureExists(room, "Room Does Not Exist"))
            .then(room => ensureRoomHasEnoughPlayers(room))
            .then(room => generateGame(room, categories))
            .then(game => nextTurn(game))
            .then(game => addGame(repository)(game))
            .then(game => emitEventToSocketRoom(io)(RoomEvents.sent.GAME_STARTED, game))
            .then(game => startCurrentPlayerTurn(io)(repository)(game, 3000))
            .then(({categories, ...rest}) => rest),

    questionAnswered: (io) => (gameId) =>
        repository.getGameById(gameId)
            .then(game => ensureExists(game, "Game Does Not Exist"))
            .then(game => nextTurn(game))
            .then(game => startCurrentPlayerTurn(io)(repository)(game, 0))
            .then(game => updateGame(repository)(game))
            .then(({categories, ...rest}) => rest),

    timeRanOut: (io) => (gameId, playerId, question) =>
        repository.getGameById(gameId)
            .then(game => ensureExists(game, "Game Does Not Exist"))
            .then(game => eliminateTryFromCurrentPlayer(game, question))
            .then(game => endGameIfNoMorePlayers(io)(game))
            .then(game => nextTurn(game))
            .then(game => startCurrentPlayerTurn(io)(repository)(game, 0))
            .then(game => updateGame(repository)(game))
            .catch(err => {
                if(err instanceof Error) {
                    Promise.reject(err)
                } else {
                    const {categories, ...rest} = err
                    Promise.resolve(rest)
                }
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

const emitEventToSocketRoom = (socketManager) => (eventName, obj) => {
    if (obj.categories) {
        const { categories, ...rest } = obj;
        socketManager.to(obj.roomId).emit(eventName, rest)
    } else {
        socketManager.to(obj.roomId).emit(eventName, obj)
    }

    return obj
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

const startCurrentPlayerTurn = io => repository => (game, time) => {
    const questions = repository.getAllQuestions().filter(question => game.categories.includes(question.category))
    const question = questions[Math.floor(Math.random() * questions.length)];
    setTimeout(() => {
        io.in(game.currentPlayer.playerId).emit(RoomEvents.sent.YOUR_TURN, question.question);
    }, time)
    return game;
};

const nextTurn = game => {
    const indexOfCurrentPlayer = game.players.findIndex(player => player.playerId === game.currentPlayer.playerId);
    const activePlayers = game.players.filter(player => player.remainingTries > 0);
    game.currentPlayer = activePlayers[indexOfCurrentPlayer + 1] || activePlayers[0];

    return game;
};

const eliminateTryFromCurrentPlayer = (game, question) => {
    const indexOfCurrentPlayer = game.players.findIndex(player => player.playerId === game.currentPlayer.playerId);
    game.players[indexOfCurrentPlayer].failedTries.push(question)
    game.players[indexOfCurrentPlayer].remainingTries -= 1
    return game;
};

const endGameIfNoMorePlayers = io => game => {
    const activePlayers = game.players.filter(player => player.remainingTries > 0);
    if (activePlayers.length === 1) {
        game.players = game.players.sort((a, b) => (a.remainingTries > b.remainingTries) ? -1 : ((b.remainingTries > a.remainingTries) ? 1 : 0))
        const {categories, ...rest} = game;
        emitEventToSocketRoom(io)(RoomEvents.sent.GAME_FINISHED, game)
        return Promise.reject(rest)
    }

    return game;
};

const ApiError = require("./Errors/ApiError");
const HttpStatusCode = require("./HttpStatusCode");
const SocketIoServer = require("./SocketIoServer");
const {v4: uuid} = require("uuid");
const GameEvents = require("./GameEvents");

module.exports = (repository) => ({
    // Player In Turn Answers Question
    questionAnswered: (io) => (gameId) =>
        repository.getGameById(gameId)
            .then(game => ensureExists(game, "Game Does Not Exist"))
            .then(game => nextTurn(game))
            .then(game => startCurrentPlayerTurn(io)(repository)(game, 0))
            .then(game => updateGame(repository)(game)),

    // Player In Turn Fails To Answer Question
    timeRanOut: (io) => (gameId, playerId, question) =>
        repository.getGameById(gameId)
            .then(game => ensureExists(game, "Game Does Not Exist"))
            .then(game => eliminateTryFromCurrentPlayer(game, question))
            .then(game => endGameIfNoMorePlayers(io)(game))
            .then(game => nextTurn(game))
            .then(game => startCurrentPlayerTurn(io)(repository)(game, 0))
            .then(game => updateGame(repository)(game))
            .catch(err => err instanceof Error ? Promise.reject(err) : Promise.resolve(err)),

    startGame: (io) => (room, categories) =>
        new Promise((resolve) => resolve(generateGame(room, categories)))
            .then(game => nextTurn(game))
            .then(game => addGame(repository)(game))
            .then(game => notifyPlayersThatTheGameStarted(io)(game))
            .then(game => startCurrentPlayerTurn(io)(repository)(game, 3000)),
});

const ensureExists = (obj, errorMessage) => {
    if (!obj) throw new ApiError(errorMessage, HttpStatusCode.BadRequest)
    return obj;
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
        SocketIoServer.emitEventToSocketRoom(io)(GameEvents.sent.GAME_FINISHED, game)
        return Promise.reject(game)
    }

    return game;
};

const updateGame = (repository) => (game) => {
    return repository.updateGame(game)
}

const nextTurn = game => {
    const indexOfCurrentPlayer = game.players.findIndex(player => player.playerId === game.currentPlayer.playerId);
    const activePlayers = game.players.filter(player => player.remainingTries > 0);
    game.currentPlayer = activePlayers[indexOfCurrentPlayer + 1] || activePlayers[0];

    return game;
};

const startCurrentPlayerTurn = io => repository => (game, time) => {
    const questions = repository.getAllQuestions().filter(question => game.categories.includes(question.category))
    const question = questions[Math.floor(Math.random() * questions.length)];
    setTimeout(() => {
        io.in(game.currentPlayer.playerId).emit(GameEvents.sent.YOUR_TURN, question.question);
    }, time)
    return game;
};

const addGame = (repository) => (game) => {
    return repository.addGame(game)
}

const generateGame = (room, categories) => ({
    gameId: uuid(),
    roomId: room.roomId,
    numberOfTries: 3,
    categories,
    currentPlayer: {...room.players[0], remainingTries: 3, failedTries: []},
    players: room.players.map(player => ({...player, remainingTries: 3, failedTries: []}))
});

const notifyPlayersThatTheGameStarted = (socketManager) => (game) => {
    SocketIoServer.emitEventToSocketRoom(socketManager)(GameEvents.sent.GAME_STARTED, game)
    return game;
}

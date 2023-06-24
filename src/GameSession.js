const ApiError = require("./Errors/ApiError");
const HttpStatusCode = require("./HttpStatusCode");
const SocketIoServer = require("./SocketIoServer");
const {v4: uuid} = require("uuid");
const GameEvents = require("./GameEvents");

module.exports = (repository) => (io) => ({
    startGame: (room, categories) =>
        new Promise((resolve) => resolve(generateGame(room, categories)))
            .then(game => nextTurn(game))
            .then(game => addGame(repository)(game))
            .then(game => notifyPlayersThatTheGameStarted(io)(game))
            .then(game => startCurrentPlayerTurn(io)(repository)(game, 3000)),

    questionAnswered: (gameId) =>
        repository.getGameById(gameId)
            .then(game => ensureExists(game, "Game Does Not Exist"))
            .then(game => nextTurn(game))
            .then(game => startCurrentPlayerTurn(io)(repository)(game, 0))
            .then(game => updateGame(repository)(game)),

    timeRanOut: (gameId, playerId, question) =>
        repository.getGameById(gameId)
            .then(game => ensureExists(game, "Game Does Not Exist"))
            .then(game => eliminateTryFromCurrentPlayer(game, question))
            .then(game => endGameIfNoMorePlayers(io)(game))
            .then(game => nextTurn(game))
            .then(game => startCurrentPlayerTurn(io)(repository)(game, 0))
            .then(game => updateGame(repository)(game))
            .catch(err => err instanceof Error ? Promise.reject(err) : Promise.resolve(err)),
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
        SocketIoServer.emitEventToClient(io)(game.currentPlayer.playerId, GameEvents.sent.YOUR_TURN, question.question);
    }, time)
    return game;
};

const addGame = (repository) => (game) => {
    return repository.addGame(game)
}

const generateGame = (room, categories) => {
    const numberOfTries = 3;

    const host = {
        playerId: room.host.hostId,
        playerName: room.host.hostName,
        remainingTries: numberOfTries,
        failedTries: []
    };
    const guest = {
        playerId: room.guest.playerId,
        playerName: room.guest.playerName,
        remainingTries: numberOfTries, 
        failedTries: []
    };

    return {
        gameId: uuid(),
        roomId: room.roomId,
        numberOfTries: numberOfTries,
        categories,
        currentPlayer: host,
        players: [host, guest]
    }
};

const notifyPlayersThatTheGameStarted = (socketManager) => (game) => {
    SocketIoServer.emitEventToSocketRoom(socketManager)(GameEvents.sent.GAME_STARTED, game)
    return game;
}

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
            .then(game => addPointToCurrentPlayer(game))
            .then(game => endGamePlayersReachedPoints(io)(game))
            .then(game => nextTurn(game))
            .then(game => startCurrentPlayerTurn(io)(repository)(game, 0))
            .then(game => updateGame(repository)(game))
            .catch(err => err instanceof Error ? Promise.reject(err) : Promise.resolve(err)),

    timeRanOut: (gameId) =>
        repository.getGameById(gameId)
            .then(game => ensureExists(game, "Game Does Not Exist"))
            .then(game => nextTurn(game))
            .then(game => startCurrentPlayerTurn(io)(repository)(game, 0))
            .then(game => updateGame(repository)(game))
});

const ensureExists = (obj, errorMessage) => {
    if (!obj) throw new ApiError(errorMessage, HttpStatusCode.BadRequest)
    return obj;
};

const addPointToCurrentPlayer = (game) => {
    const indexOfCurrentPlayer = game.players.findIndex(player => player.playerId === game.currentPlayer.playerId);
    // game.players[indexOfCurrentPlayer].questionAnswered().push(question)
    game.players[indexOfCurrentPlayer].points += 1
    return game;
};

const endGamePlayersReachedPoints = io => game => {
    const winningPlayers = game.players.filter(player => player.points === game.numberOfPoints);
    if (winningPlayers.length === 1) {
        game.players = game.players.sort((a, b) => (a.points > b.points) ? -1 : ((b.points > a.points) ? 1 : 0))
        SocketIoServer.emitEventToSocketRoom(io)(GameEvents.sent.GAME_FINISHED, game)
        return Promise.reject(game)
    }
    
    if(game.players.every(player => player.points === game.numberOfPoints - 1)) {
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
    game.currentPlayer = game.players[indexOfCurrentPlayer + 1] || game.players[0];

    return game;
};

const startCurrentPlayerTurn = io => repository => (game, time) => {
    const questions = repository.getAllQuestions().filter(question => game.categories.includes(question.categoryId))
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
    const numberOfPoints = 5;

    const host = {
        playerId: room.host.hostId,
        playerName: room.host.hostName,
        points: 0,
        questionsAnswered: []
    };
    const guest = {
        playerId: room.guest.playerId,
        playerName: room.guest.playerName,
        points: 0, 
        questionsAnswered: []
    };

    return {
        gameId: uuid(),
        roomId: room.roomId,
        numberOfPoints: numberOfPoints,
        categories,
        currentPlayer: host,
        players: [host, guest]
    }
};

const notifyPlayersThatTheGameStarted = (socketManager) => (game) => {
    SocketIoServer.emitEventToSocketRoom(socketManager)(GameEvents.sent.GAME_STARTED, game)
    return game;
}

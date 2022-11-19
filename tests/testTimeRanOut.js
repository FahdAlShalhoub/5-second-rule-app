const sinon = require("sinon");
const {setup, setupGame, setupInGamePlayer} = require("./setups");
const GameEvents = require("../src/GameEvents");
const expect = require("chai").expect;

describe('testTimeRanOut', function () {
    let roomsRepository;
    let GameSession;
    const GameSessionFactory = require("../src/GameSession");
    const gameId = "ExampleGameId";
    const emitSpy = sinon.spy()
    const joinSpy = sinon.spy()
    const socketManagerSpy = sinon.spy({
        in: () => ({
            socketsJoin: joinSpy,
            emit: emitSpy
        }),
        to: () => ({
            emit: emitSpy
        })
    });

    beforeEach(() => {
        socketManagerSpy.to.resetHistory();
        emitSpy.resetHistory();
        joinSpy.resetHistory();

        const games = [{
            gameId,
            roomId: "ExampleRoomId",
            numberOfTries: 3,
            categories: ["category"],
            currentPlayer: {playerId: "ExampleHostId", remainingTries: 3, failedTries: []},
            players: [{playerId: "ExampleHostId", remainingTries: 3, failedTries: []}, {
                playerId: "ExamplePlayerId",
                remainingTries: 3,
                failedTries: []
            }]
        }];
        roomsRepository = require("../src/Repositories/InMemoryRoomRepository")([], games, [{
            question: "ExampleQuestion",
            category: "category"
        }])
        GameSession = GameSessionFactory(roomsRepository)
    })

    it('Should Return Game Object With Player Having a Failed Try Successfully', function (done) {
        GameSession
            .timeRanOut(socketManagerSpy)(gameId, "ExampleHostId", "ExampleQuestion")
            .then((game) => {
                expect(game.players[0]).to.have.property("failedTries").have.members(["ExampleQuestion"])
                expect(game.players[0].remainingTries).to.equal(2)
                done()
            })
            .catch(err => done(err))
    });

    it('Should Save Game Having a Player With a Failed Try Successfully', function (done) {
        GameSession
            .timeRanOut(socketManagerSpy)(gameId, "ExampleHostId", "ExampleQuestion")
            .then(() => roomsRepository.getGameById(gameId))
            .then((game) => {
                expect(game.players[0]).to.have.property("failedTries").have.members(["ExampleQuestion"])
                expect(game.players[0].remainingTries).to.equal(2)
                done()
            })
            .catch(err => done(err))
    });

    it('Should End Game If Only One Active Player Remains', function (done) {
        const player1 = {...setupInGamePlayer(), playerId: "Player1",remainingTries: 3};
        const player2 = {...setupInGamePlayer(), playerId: "Player2", remainingTries: 1};

        const {roomsRepository} =
            setup({games: [
                setupGame({players: [player1, player2], currentPlayer: player2})
            ]});

        GameSessionFactory(roomsRepository)
            .timeRanOut(socketManagerSpy)(gameId, player2.playerId, "ExampleQuestion")
            .then(() => {
                expect(socketManagerSpy.to().emit.calledOnce).to.be.true;
                expect(socketManagerSpy.to().emit.args[0][0]).to.equal(GameEvents.sent.GAME_FINISHED);
                expect(socketManagerSpy.to().emit.args[0][1].players[1]).to.have.property("failedTries").have.members(["ExampleQuestion"])
                expect(socketManagerSpy.to().emit.args[0][1].players[1].remainingTries).to.equal(0)
                done()
            })
            .catch(err => done(err))
    });

    it('Should Pass Turn To Next Player Successfully', function (done) {
        GameSession
            .timeRanOut(socketManagerSpy)(gameId, "ExampleHostId", "ExampleQuestion")
            .then(() => roomsRepository.getGameById(gameId))
            .then((game) => {
                expect(game.currentPlayer.playerId).to.equal("ExamplePlayerId")
                done()
            })
            .catch(err => done(err))
    });

    it('Should Throw Error If Game Does Not Exist', function (done) {
        const {
            roomsRepository
        } = setup({});

        GameSessionFactory(roomsRepository)
            .timeRanOut(socketManagerSpy)("", "", "")
            .then(() => done("Error Failed To Throw"))
            .catch((err) => {
                expect(err.message).to.equal("Game Does Not Exist")
                done()
            })
            .catch(err => done(err))
    });

});

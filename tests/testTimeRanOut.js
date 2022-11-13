const sinon = require("sinon");
const expect = require("chai").expect;

describe('testTimeRanOut', function () {
    let roomsRepository;
    let GameSession;
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
        roomsRepository = require("../src/Repositories/InMemoryRoomRepository")([], games, [{question: "ExampleQuestion", category: "category"}])
        GameSession = require("../src/GameSession")(roomsRepository)
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


});

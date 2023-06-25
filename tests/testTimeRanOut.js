const sinon = require("sinon");
const {setup, setupInGamePlayer} = require("./setups");
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
        sinon.resetHistory();

        const games = [{
            gameId,
            roomId: "ExampleRoomId",
            numberOfPoints: 5,
            categories: ["category"],
            currentPlayer: setupInGamePlayer({playerId: "ExampleHostId"}),
            players: [setupInGamePlayer({playerId: "ExampleHostId"}), setupInGamePlayer({})]
        }];
        roomsRepository = require("../src/Repositories/InMemoryRoomRepository")([], games, [{
            question: "ExampleQuestion",
            category: "category"
        }])
        GameSession = GameSessionFactory(roomsRepository)(socketManagerSpy)
    })

    it('Should Pass Turn To Next Player Successfully', function (done) {
        GameSession
            .timeRanOut(gameId, "ExampleHostId", "ExampleQuestion")
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

        GameSessionFactory(roomsRepository)(socketManagerSpy)
            .timeRanOut("", "", "")
            .then(() => done("Error Failed To Throw"))
            .catch((err) => {
                expect(err.message).to.equal("Game Does Not Exist")
                done()
            })
            .catch(err => done(err))
    });

});

const sinon = require("sinon");
const {setup, setupGame, setupInGamePlayer} = require("./setups");
const GameEvents = require("../src/GameEvents");
const expect = require("chai").expect;

describe('testQuestionAnswered', function () {
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
            numberOfPoints: 3,
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

    it('Should Return Game Object With Player Having a Succes Try Successfully', function (done) {
        GameSession
            .questionAnswered(gameId, "ExampleHostId", "ExampleQuestion")
            .then((game) => {
                // expect(game.players[0]).to.have.property("questionsAnswered").have.members(["ExampleQuestion"])
                expect(game.players[0].points).to.equal(1)
                done()
            })
            .catch(err => done(err))
    });

    it('Should Save Game Having a Player With a Question Answered Successfully', function (done) {
        GameSession
            .questionAnswered(gameId, "ExampleHostId", "ExampleQuestion")
            .then(() => roomsRepository.getGameById(gameId))
            .then((game) => {
                // expect(game.players[0]).to.have.property("questionsAnswered").have.members(["ExampleQuestion"])
                expect(game.players[0].points).to.equal(1)
                done()
            })
            .catch(err => done(err))
    });

    it('Should End Game If Player Answers 5 Times', function (done) {
        const player1 = {...setupInGamePlayer({playerId: "Player1"}), points: 3};
        const player2 = {...setupInGamePlayer({playerId: "Player2"}), points: 4};

        const {roomsRepository} =
            setup({games: [
                    setupGame({players: [player1, player2], currentPlayer: player2})
                ]});

        GameSessionFactory(roomsRepository)(socketManagerSpy)
            .questionAnswered(gameId, player2.playerId, "ExampleQuestion")
            .then(() => {
                expect(socketManagerSpy.to().emit.calledOnce).to.be.true;
                expect(socketManagerSpy.to().emit.args[0][0]).to.equal(GameEvents.sent.GAME_FINISHED);
                expect(socketManagerSpy.to().emit.args[0][1].players[0]).to.have.property("questionsAnswered").have.members([])
                expect(socketManagerSpy.to().emit.args[0][1].players[0].points).to.equal(5)
                done()
            })
            .catch((err) => {
               done(err)
            })
    });
    
    it('Should End Game If Both Players Answered 4 Times', function (done) {
        const player1 = {...setupInGamePlayer({playerId: "Player1"}), points: 4};
        const player2 = {...setupInGamePlayer({playerId: "Player2"}), points: 3};

        const {roomsRepository} =
            setup({games: [
                    setupGame({players: [player1, player2], currentPlayer: player2})
                ]});

        GameSessionFactory(roomsRepository)(socketManagerSpy)
            .questionAnswered(gameId, player2.playerId, "ExampleQuestion")
            .then(() => {
                expect(socketManagerSpy.to().emit.calledOnce).to.be.true;
                expect(socketManagerSpy.to().emit.args[0][0]).to.equal(GameEvents.sent.GAME_FINISHED);
                expect(socketManagerSpy.to().emit.args[0][1].players[0]).to.have.property("questionsAnswered").have.members([])
                expect(socketManagerSpy.to().emit.args[0][1].players[0].points).to.equal(4)
                expect(socketManagerSpy.to().emit.args[0][1].players[1].points).to.equal(4)
                done()
            })
            .catch((err) => {
               done(err)
            })
    });

    it('Should Pass Turn To Next Player Successfully', function (done) {
        GameSession
            .questionAnswered(gameId, "ExampleHostId", "ExampleQuestion")
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
            .questionAnswered("", "", "")
            .then(() => done("Error Failed To Throw"))
            .catch((err) => {
                expect(err.message).to.equal("Game Does Not Exist")
                done()
            })
            .catch(err => done(err))
    });

});

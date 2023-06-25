const ApiError = require("../src/Errors/ApiError");
const expect = require("chai").expect;
const {setup, setupRoom} = require("./setups");

describe('testInitiateGame', function () {
    it('Should Return Game Successfully', function (done) {
        const {roomManager, socketManagerSpy, roomId, host} = setup({rooms: [setupRoom({})]});

        roomManager.initiateGame(socketManagerSpy)(roomId, ["category1", "category2", "category3"])
            .then((game) => {
                expect(game).to.have.property("gameId").to.match(new RegExp("^[0-9a-fA-F]{8}\\b-[0-9a-fA-F]{4}\\b-[0-9a-fA-F]{4}\\b-[0-9a-fA-F]{4}\\b-[0-9a-fA-F]{12}$"))
                expect(game).to.have.property("numberOfPoints").to.equal(5)
                expect(game).to.have.property("categories").to.have.members(["category1", "category2", "category3"])
                expect(game).to.have.property("currentPlayer").to.have.deep.equal({
                    playerId: "ExamplePlayerId",
                    playerName: "ExamplePlayerName",
                    points: 0,
                    questionsAnswered: []
                })
                expect(game).to.have.property("players").to.deep.members([
                    {
                        playerId: host.hostId,
                        playerName: host.hostName,
                        points: 0,
                        questionsAnswered: []
                    },
                    {
                        playerId: "ExamplePlayerId",
                        playerName: "ExamplePlayerName",
                        points: 0,
                        questionsAnswered: []
                    }
                ])
                done()
            })
            .catch(err => done(err))
    });

    it('Should Emit Game Started Event Successfully', function (done) {
        const {roomManager, socketManagerSpy, roomId, host, emitSpy} = setup({rooms: [setupRoom({})]});

        roomManager.initiateGame(socketManagerSpy)(roomId, ["category1", "category2", "category3"])
            .then(() => {
                expect(emitSpy.getCall(0).args[0]).to.have.equal("game_started")
                expect(emitSpy.getCall(0).args[1]).to.have.property("numberOfPoints").to.equal(5)
                expect(emitSpy.getCall(0).args[1]).to.have.property("categories").to.have.members(["category1", "category2", "category3"])
                expect(emitSpy.getCall(0).args[1]).to.have.property("currentPlayer").to.have.deep.equal({
                    playerId: "ExamplePlayerId",
                    playerName: "ExamplePlayerName",
                    points: 0,
                    questionsAnswered: []
                })
                expect(emitSpy.getCall(0).args[1]).to.have.property("players").to.deep.members([
                    {
                        playerId: host.hostId,
                        playerName: host.hostName,
                        points: 0,
                        questionsAnswered: []
                    },
                    {
                        playerId: "ExamplePlayerId",
                        playerName: "ExamplePlayerName",
                        points: 0,
                        questionsAnswered: []
                    }
                ])
                done()
            })
            .catch(err => done(err))
    });

    // it('Should Emit your_turn Event To The Second Player Successfully', function (done) {
    //     this.timeout(4000);
    //     RoomManager.InitiateGame(socketManagerSpy)(roomId, ["category1", "category2", "category3"])
    //         .then(() => setTimeout(() => {
    //             expect(emitToSocketSpy.getCall(0).args[0]).to.have.equal("your_turn")
    //             const questions = roomsRepository.getAllQuestions()
    //             expect(emitToSocketSpy.getCall(0).args[1]).to.be.deep.oneOf(questions.map(q => q.question))
    //             done()
    //         }, 3000))
    //         .catch(err => done(err))
    // });

    it('Should Save Game Successfully', function (done) {
        const {roomManager, roomsRepository, socketManagerSpy, roomId, host} = setup({rooms: [setupRoom({})]});

        roomManager.initiateGame(socketManagerSpy)(roomId, ["category1", "category2", "category3"])
            .then(() => roomsRepository.getGameByRoomId(roomId))
            .then((savedGame) => {
                expect(savedGame).to.have.property("numberOfPoints").to.equal(5)
                expect(savedGame).to.have.property("categories").to.have.members(["category1", "category2", "category3"])
                expect(savedGame).to.have.property("currentPlayer").to.have.deep.equal({
                    playerId: "ExamplePlayerId",
                    playerName: "ExamplePlayerName",
                    points: 0,
                    questionsAnswered: []
                })
                expect(savedGame).to.have.property("players").to.deep.members([
                    {
                        playerId: host.hostId,
                        playerName: host.hostName,
                        points: 0,
                        questionsAnswered: []
                    },
                    {
                        playerId: "ExamplePlayerId",
                        playerName: "ExamplePlayerName",
                        points: 0,
                        questionsAnswered: []
                    }
                ])
                done()
            })
            .catch(err => done(err))
    });

    it('Should Throw Error If Room Does Not Exist', function (done) {
        const {roomManager, socketManagerSpy, roomId} = setup({});

        roomManager.initiateGame(socketManagerSpy)(roomId, [])
            .then(() => done(new Error("Did Not Throw Error")))
            .catch(err => {
                expect(err).to.be.instanceof(ApiError)
                expect(err.statusCode).to.be.equal(400)
                expect(err.message).equal("Room Does Not Exist")
                done();
            })
            .catch(err => {
                done(err)
            });
    });

    it('Should Throw Error If Room Has Only One Player', function (done) {
        const {socketManagerSpy, roomManager, roomId} = setup({
            rooms: [setupRoom({guest: null})]
        })

        roomManager.initiateGame(socketManagerSpy)(roomId, ["category1", "category2", "category3"])
            .then(() => done(new Error("Did Not Throw Error")))
            .catch(err => {
                expect(err).to.be.instanceof(ApiError)
                expect(err.statusCode).to.be.equal(400)
                expect(err.message).equal("Room Does Not Have Enough Players")
                done();
            })
            .catch(err => {
                done(err)
            });
    });
});

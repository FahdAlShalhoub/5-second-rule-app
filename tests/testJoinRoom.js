const RoomStatuses = require("../src/RoomStatuses");
const expect = require("chai").expect;
const roomRepositoryFactory = require("./InMemoryRepositories/InMemoryRoomRepository");
const ApiError = require("../src/Errors/ApiError");
const sinon = require("sinon");

describe("testJoinRoom", () => {
    let roomsRepository;
    let RoomManager;
    const roomId = "ExampleRoomId";
    const emitSpy = sinon.spy(() => new Promise((resolve) => resolve()))
    const socketManagerSpy = sinon.spy({
        to: () => ({
            emit: emitSpy
        })
    });

    beforeEach(() => {
        socketManagerSpy.to.resetHistory();
        emitSpy.resetHistory();

        const rooms = [{
            roomId,
            host: {hostId: "ExampleHostId", hostName: "ExampleHostName"},
            roomStatus: RoomStatuses.Active,
            players: []
        }];
        roomsRepository = require("./InMemoryRepositories/InMemoryRoomRepository")(rooms)
        RoomManager = require("../src/RoomManager")(roomsRepository, socketManagerSpy)
    })

    it('Should Return Joined Room Successfully', function (done) {
        const playerId = "ExamplePlayerId";
        const playerName = "ExamplePlayerName";
        const roomId = "ExampleRoomId";

        RoomManager.joinRoom({playerId, playerName}, roomId, roomsRepository)
            .then((result) => {
                expect(result.players).to.have.deep.members([{playerId, playerName}])
                done();
            })
            .catch(err => done(err))
    });

    it('Should Save Room With Newly Joined Player Successfully', function (done) {
        const playerId = "ExamplePlayerId";
        const playerName = "ExamplePlayerName";
        const roomId = "ExampleRoomId";

        RoomManager.joinRoom({playerId, playerName}, roomId, roomsRepository)
            .then(() => roomsRepository.getActiveRoomById(roomId))
            .then(result => {
                expect(result.players).to.have.length(1)
                done();
            })
            .catch(err => done(err))
    });

    it('Should Throw Error If Room Does Not Exist', function (done) {
        const playerId = "ExamplePlayerId";
        const playerName = "ExamplePlayerName";
        const roomId = "ExampleRoomId";
        const RoomManager = require("../src/RoomManager")(roomRepositoryFactory([]))

        RoomManager.joinRoom({playerId, playerName}, roomId)
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

    it('Should Publish joined_room Event', function (done) {
        const playerId = "ExamplePlayerId";
        const playerName = "ExamplePlayerName";
        const roomId = "ExampleRoomId";

        RoomManager.joinRoom({playerId, playerName}, roomId)
            .then(() => {
                expect(socketManagerSpy.to.calledOnce).to.be.true;
                expect(socketManagerSpy.to.getCall(0).args[0]).to.equal(roomId)
                expect(socketManagerSpy.to().emit.calledOnce).to.be.true;
                expect(socketManagerSpy.to().emit.getCall(0).args[0]).to.equal("player_joined")
            })
            .then(() => roomsRepository.getActiveRoomById(roomId))
            .then((room) => {
                expect(socketManagerSpy.to().emit.getCall(0).args[1]).to.deep.equal(room)
                done()
            })
            .catch(err => {
                done(err)
            });
    });

});

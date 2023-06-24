const RoomStatuses = require("../src/RoomStatuses");
const expect = require("chai").expect;
const roomRepositoryFactory = require("../src/Repositories/InMemoryRoomRepository");
const ApiError = require("../src/Errors/ApiError");
const sinon = require("sinon");

describe("testJoinRoom", () => {
    let roomsRepository;
    let RoomManager;
    const roomId = "ExampleRoomId";
    const host = {hostId: "ExampleHostId", hostName: "ExampleHostName"}
    const emitSpy = sinon.spy()
    const joinSpy = sinon.spy()
    const socketManagerSpy = sinon.spy({
        in: () => ({
            socketsJoin: joinSpy
        }),
        to: () => ({
            emit: emitSpy
        })
    });

    beforeEach(() => {
        sinon.resetHistory();

        const rooms = [{
            roomId,
            host,
            roomStatus: RoomStatuses.Active,
            guest: null
        }];
        roomsRepository = require("../src/Repositories/InMemoryRoomRepository")(rooms, [])
        RoomManager = require("../src/RoomManager")(roomsRepository)
    })

    it('Should Return Joined Room Successfully', function (done) {
        const playerId = "ExamplePlayerId";
        const playerName = "ExamplePlayerName";
        const roomId = "ExampleRoomId";

        RoomManager.joinRoom(socketManagerSpy)({playerId, playerName}, roomId, roomsRepository)
            .then((room) => {
                expect(room.guest).to.have.property("playerId").to.equal(playerId);
                expect(room.guest).to.have.property("playerName").to.equal(playerName);
                done();
            })
            .catch(err => done(err))
    });

    it('Should Save Room With Newly Joined Player Successfully', function (done) {
        const playerId = "ExamplePlayerId";
        const playerName = "ExamplePlayerName";
        const roomId = "ExampleRoomId";

        RoomManager.joinRoom(socketManagerSpy)({playerId, playerName}, roomId, roomsRepository)
            .then(() => roomsRepository.getActiveRoomById(roomId))
            .then(result => {
                expect(result.guest).to.have.property("playerId").to.equal(playerId);
                expect(result.guest).to.have.property("playerName").to.equal(playerName);
                done();
            })
            .catch(err => done(err))
    });

    it('Should Throw Error If Room Does Not Exist', function (done) {
        const playerId = "ExamplePlayerId";
        const playerName = "ExamplePlayerName";
        const roomId = "ExampleRoomId";
        const RoomManager = require("../src/RoomManager")(roomRepositoryFactory([]))

        RoomManager.joinRoom(socketManagerSpy)({playerId, playerName}, roomId)
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

        RoomManager.joinRoom(socketManagerSpy)({playerId, playerName}, roomId)
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

    it('Should Add Client To Room', function (done) {
        const playerId = "ExamplePlayerId";
        const playerName = "ExamplePlayerName";
        const roomId = "ExampleRoomId";

        RoomManager.joinRoom(socketManagerSpy)({playerId, playerName}, roomId)
            .then(() => {
                expect(joinSpy.calledOnce).to.be.true
                expect(joinSpy.getCall(0).args[0]).to.equal(roomId)
                done()
            })
            .catch(err => {
                done(err)
            });
    });

    it('Should Not Add host As Guest Player', function (done) {
        const roomId = "ExampleRoomId";

        RoomManager.joinRoom(socketManagerSpy)({playerId: host.hostId, playerName: host.hostName}, roomId)
            .then(() => roomsRepository.getActiveRoomById(roomId))
            .then((room) => {
                expect(room.guest).to.equal(null);
                done()
            })
            .catch(err => {
                done(err)
            });
    });

});

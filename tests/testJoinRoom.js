const RoomManager = require("../src/RoomManager");
const RoomStatuses = require("../src/RoomStatuses");
const expect = require("chai").expect;
const roomRepositoryFactory = require("./InMemoryRepositories/InMemoryRoomRepository");
const ApiError = require("../src/Errors/ApiError");

describe("testJoinRoom", () => {
    let rooms;
    let roomsRepository;
    let roomId = "ExampleRoomId";

    beforeEach(() => {
        rooms = [{
            roomId,
            host: {hostId: "ExampleHostId", hostName: "ExampleHostName"},
            status: RoomStatuses.Active,
            players: []
        }];
        roomsRepository = require("./InMemoryRepositories/InMemoryRoomRepository")(rooms)
    })

    it('Should Return Joined Room Successfully', function (done) {
        const playerId = "ExamplePlayerId";
        const playerName = "ExamplePlayerName";
        const roomId = "ExampleRoomId";

        RoomManager.joinRoom({playerId, playerName}, roomId, roomsRepository)
            .then((result) => {
                expect(result.players[0].playerName).equal(playerName)
                expect(result.players[0].playerId).equal(playerId)
                done();
            })
            .catch(err => done(err))
    });

    it('Should Save Room With Newly Joined Player Successfully', function (done) {
        const playerId = "ExamplePlayerId";
        const playerName = "ExamplePlayerName";
        const roomId = "ExampleRoomId";

        RoomManager.joinRoom({playerId, playerName}, roomId, roomsRepository)
            .then(() => {
                expect(rooms[0].players).to.have.length(1)
                done();
            })
            .catch(err => done(err))
    });

    it('Should Throw Error If Room Does Not Exist', function (done) {
        const playerId = "ExamplePlayerId";
        const playerName = "ExamplePlayerName";
        const roomId = "ExampleRoomId";
        const roomsRepository = roomRepositoryFactory([]);

        RoomManager.joinRoom({playerId, playerName}, roomId, roomsRepository)
            .then(() => {
                expect(rooms[0].players).to.have.length(1)
                done(new Error("Did Not Throw Error"));
            })
            .catch(err => {
                expect(err).to.be.instanceof(ApiError)
                expect(err.message).equal("Room Does Not Exist")
                done();
            });
    });

});

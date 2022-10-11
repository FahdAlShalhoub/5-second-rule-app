const sinon = require("sinon");

describe('testTimeRanOut', function () {
    let roomsRepository;
    let RoomManager;
    const gameId = "ExampleGameId";
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
        roomsRepository = require("../src/Repositories/InMemoryRoomRepository")([], games, [])
        RoomManager = require("../src/RoomManager")(roomsRepository)
    })

    it('Should Return Game Object With Player Having a Failed Try Successfully', function () {
        // RoomManager.timeRanOut(ExamplePlayerId)
    });
});

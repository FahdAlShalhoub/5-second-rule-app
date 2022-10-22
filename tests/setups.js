const sinon = require("sinon");
const RoomStatuses = require("../src/RoomStatuses");

module.exports = {
    roomId: "ExampleRoomId",
    host: {hostId: "ExampleHostId", hostName: "ExampleHostName"},
    setup({rooms, questions, games}) {
        const emitSpy = sinon.spy()
        const emitToSocketSpy = sinon.spy()
        const socketManagerSpy = sinon.spy({
            in: () => ({
                socketsJoin: emitSpy,
                emit: emitToSocketSpy
            }),
            to: () => ({
                emit: emitSpy
            }),
        });

        const roomsRepository = require("../src/Repositories/InMemoryRoomRepository")(rooms || [], games || [], questions || [{
            question: "ExampleQuestion",
            category: "category1"
        }])

        const roomManager = require("../src/RoomManager")(roomsRepository)

        return {
            roomId: module.exports.roomId,
            host: module.exports.host,
            roomsRepository,
            roomManager,
            socketManagerSpy,
            emitSpy,
            emitToSocketSpy
        }
    },

    setupPlayer() {
        return {
            playerId: "ExamplePlayerId",
            playerName: "ExamplePlayerName"
        }
    },

    setupHostPlayer() {
        return {
            ...module.exports.setupPlayer(),
            playerId: module.exports.host.hostId,
            playerName: module.exports.host.hostName
        }
    },

    setupRoom({players, roomStatus}) {
        return {
            roomId: module.exports.roomId,
            host: module.exports.host,
            roomStatus: roomStatus || RoomStatuses.Active,
            players: players || [
                module.exports.setupHostPlayer(),
                module.exports.setupPlayer()
            ]
        };
    }
}

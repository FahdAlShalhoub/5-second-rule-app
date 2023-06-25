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
        }], [{
            catId: " cat-01-tv",
            categoryText: "أفلام و مسلسلات",
            hasNewQuestions: false,
            imageUrl: "https://firebasestorage.googleapis.com/v0/b/fivesecondrule-c893d.appspot.com/o/tv.png?alt=media&token=e820a362-b010-4df4-b014-8571fb419124",
            isChosen: false,
            isNewCategory: false
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

    setupInGamePlayer({playerId}) {
        return {
            playerId: playerId || "ExamplePlayerId",
            playerName: "ExamplePlayerName",
            points: 0,
            questionsAnswered: []
        }
    },

    setupHostPlayer() {
        return {
            ...module.exports.setupPlayer(),
            playerId: module.exports.host.hostId,
            playerName: module.exports.host.hostName
        }
    },

    setupGame({players, currentPlayer}) {
        return {
            gameId: "ExampleGameId",
            roomId: "ExampleRoomId",
            numberOfPoints: 5,
            categories: ["category"],
            currentPlayer: currentPlayer || {
                playerId: "ExampleHostId",
                points: 0,
                questionsAnswered: []
            },
            players: players || [
                {
                    playerId: "ExampleHostId",
                    points: 0,
                    questionsAnswered: []
                }, {
                    playerId: "ExamplePlayerId",
                    points: 0,
                    questionsAnswered: []
                }]
        }
    },

    setupRoom({guest: player, roomStatus}) {
        return {
            roomId: module.exports.roomId,
            host: module.exports.host,
            roomStatus: roomStatus || RoomStatuses.Active,
            guest: player === null ? null : module.exports.setupPlayer()
        };
    }
}

const {faker} = require('@faker-js/faker');
const ApiError = require("./Errors/ApiError");
const HttpStatusCode = require("./HttpStatusCode");
const RoomStatus = require("./RoomStatuses");

module.exports = (repository, socketManager) => ({
    generateRoom: (host) => new Promise((resolve, reject) => {
        const room = {
            host,
            players: [{playerName: host.hostName, playerId: host.hostId}],
            roomId: faker.random.words(3).replace(new RegExp(" ", 'g'), "-"),
            roomStatus: RoomStatus.Active
        }

        repository.getActiveRoomByHostId(room.hostId)
            .then(ensureHostHasNoActiveRoom)
            .then(insertRoomToDb)
            .then(addToSocketManagerRoom)
            .catch(err => reject(err))

        function insertRoomToDb() {
            repository.addRoom(room)
                .then(() => resolve(room))
        }

        function ensureHostHasNoActiveRoom(existingRoom) {
            if (existingRoom) {
                throw new ApiError("Host Already Has Room", HttpStatusCode.BadRequest)
            }
        }

        function addToSocketManagerRoom() {
            socketManager.in(host.hostId).socketsJoin(room.roomId)
        }
    }),

    joinRoom: (player, roomId) => new Promise((resolve, reject) => {
        repository.getActiveRoomById(roomId)
            .then(room => {
                if(!room) throw new ApiError("Room Does Not Exist", HttpStatusCode.BadRequest)
                return room;
            })
            .then(room => {
                room.players.push(player)
                return room;
            })
            .then(room => repository.updateRoom(room))
            .then((room) => {
                socketManager
                    .in(player.playerId)
                    .socketsJoin(roomId)
                socketManager
                    .to(room.roomId)
                    .emit("player_joined", room)

                resolve(room)
            })
            .catch(err => reject(err))

    })
});

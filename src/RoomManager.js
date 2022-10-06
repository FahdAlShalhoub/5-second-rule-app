const {faker} = require('@faker-js/faker');
const ApiError = require("./Errors/ApiError");
const HttpStatusCode = require("./HttpStatusCode");
const RoomStatus = require("./RoomStatuses");

module.exports = {
    generateRoom: (host, repository) => new Promise((resolve, reject) => {
        const room = {
            host,
            players: [],
            roomId: faker.random.words(3).replace(new RegExp(" ", 'g'), "-"),
            roomStatus: RoomStatus.Active
        }

        repository.getActiveRoomByHostId(room.hostId)
            .then(ensureHostHasNoActiveRoom)
            .then(insertRoomToDb)
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
    }),

    joinRoom: (player, roomId, repository) => new Promise((resolve, reject) => {
        repository.getActiveRoomById(roomId)
            .then(room => {
                if(!room) throw new ApiError("Room Does Not Exist", HttpStatusCode.BadRequest)
                return room;
            })
            .then(room => {
                room.players.push(player)
                return room;
            })
            .then(room => {
                repository.updateRoom(room)
                    .then(() => resolve(room))
                    .catch(e => reject(e))
            })
            .catch(err => reject(err))

    })
};

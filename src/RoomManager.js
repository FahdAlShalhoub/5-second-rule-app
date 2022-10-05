const {faker} = require('@faker-js/faker');
const ApiError = require("./Errors/ApiError");
const HttpStatusCode = require("./HttpStatusCode");
// const ApiError = require("./Errors/ApiError");

module.exports = {
    generateRoom: (host, repository) => new Promise((resolve, reject) => {
        const room = {
            host,
            players: [],
            roomId: faker.random.words(3).replace(new RegExp(" ", 'g'), "-")
        }

        repository.getActiveRoomByHostId(room.hostId)
            .then(ensureHostHasNoActiveRoom)
            .then(insertRoomToDb)

        function insertRoomToDb() {
            repository.addRoom(room)
                .then(() => resolve(room))
                .catch(err => reject(err));
        }

        function ensureHostHasNoActiveRoom(existingRoom) {
            if (existingRoom) {
                reject(new ApiError("Host Already Has Room", HttpStatusCode.BadRequest))
            }
        }
    }),

    joinRoom: (player, roomId, repository) => new Promise((resolve, reject) => {
        repository.getActiveRoomById(roomId)
            .then(room => {
                if(!room) reject(new ApiError("Room Does Not Exist", HttpStatusCode.BadRequest))
                room.players.push(player)
                return room;
            })
            .then(room => {
                repository.updateRoom(room)
                    .then(() => {
                        resolve(room)
                    })
                    .catch(e => reject(e))
            });

    })
};

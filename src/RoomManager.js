const {faker} = require('@faker-js/faker');
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
                reject(new Error("Host Already Has Room"))
            }
        }
    }),

    joinRoom: (player, roomId, repository) => new Promise((resolve, reject) => {
        repository.getActiveRoomById(roomId)
            .then((room) => {
                if(!room) reject(new Error("Room Does Not Exist"))
            })
            .then(room => {
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

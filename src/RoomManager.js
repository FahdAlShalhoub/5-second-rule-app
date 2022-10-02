const {faker} = require('@faker-js/faker');

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
    })
};

const RoomStatus = require("../RoomStatuses");
module.exports = (rooms, games, questions, categories) => {
    return {
        rooms,
        addRoom: (room) => new Promise((resolve, reject) => {
            try {
                rooms.push(room)
                resolve(room);
            } catch (e) {
                reject(e)
            }
        }),
        getActiveRoomByHostId: (hostId) => new Promise((resolve) => {
            resolve(rooms.find(room => room.host.hostId === hostId && room.roomStatus === RoomStatus.Active));
        }),
        getActiveRoomById: (roomId) => new Promise(resolve => {
            resolve(rooms.find(room => room.roomId === roomId && room.roomStatus === RoomStatus.Active))
        }),
        updateRoom: (room) => new Promise((resolve) => {
            rooms = [...rooms.filter(rom => rom.roomId !== room.roomId), room]
            resolve(room);
        }),
        addGame: (game) => new Promise((resolve, reject) => {
            try {
                games.push(game)
                resolve(game);
            } catch (e) {
                reject(e)
            }
        }),
        updateGame: (game) => new Promise((resolve) => {
            games = [...games.filter(gam => gam.gameId !== game.gameId), game]
            resolve(game);
        }),
        getGameByRoomId: (roomId) => new Promise((resolve) => {
            resolve(games.find(game => game.roomId === roomId));
        }),
        getAllQuestions: () => questions,
        getAllCategories: () => categories,
        getGameById: (gameId) => new Promise((resolve) => {
            resolve(games.find(game => game.gameId === gameId))
        })
    }
}

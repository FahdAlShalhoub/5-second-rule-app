const RoomStatus = require("../../src/RoomStatuses");
module.exports = (rooms) => {
    return {
        addRoom: (room) => new Promise((resolve, reject) => {
            try {
                rooms.push(room)
                resolve();
            } catch (e) {
                reject(e)
            }
        }),
        getActiveRoomByHostId: (hostId) => new Promise((resolve) => {
            resolve(rooms.find(room => room.hostId === hostId && room.status === RoomStatus.Active));
        }),
        getActiveRoomById: (roomId) => new Promise(resolve => {
            resolve(rooms.find(room => room.roomId === roomId && room.status === RoomStatus.Active))
        }),
        updateRoom: (room) => new Promise((resolve, reject) => {
            rooms = [...rooms.filter(rom => rom.roomId === room.roomId), room]
            resolve();
        })
    }
}

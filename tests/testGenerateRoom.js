const expect = require('chai').expect;
const RoomManager = require("../src/RoomManager");
const RoomStatus = require("../src/RoomStatuses");
const ApiError = require("../src/Errors/ApiError");

describe("testGenerateRoom", () => {
    let rooms = [];
    let roomsRepository;

    beforeEach(() => {
        rooms = []
        roomsRepository = require("./InMemoryRepositories/InMemoryRoomRepository")(rooms)
    });

    it('Should Return New Room Successfully', function (done) {
        const hostId = "ExampleHostId";
        const hostName = "ExampleName";

        RoomManager.generateRoom({hostId, hostName}, roomsRepository)
            .then(result => {
                expect(result).to.have.property("host").to.have.property("hostName").to.equal(hostName)
                expect(result).to.have.property("host").to.have.property("hostId").to.equal(hostId)
                expect(result).to.have.property("players").to.be.an( "array" ).that.is.empty
                expect(result).to.have.property("roomId").matches(new RegExp("^.*-.*-.*$"))
                expect(result).to.have.property("roomStatus").to.equal(RoomStatus.Active)
                done()
            })
            .catch(err => {
                done(err)
            })
    });

    it('Should Save New Room', function (done) {
        const hostId = "ExampleHostId";
        const hostName = "ExampleName";

        RoomManager.generateRoom({hostId, hostName}, roomsRepository)
            .then(result => {
                expect(rooms).to.have.members([result]);
                done()
            })
            .catch(err => done(err))
    });


    it('Should Not Save Active Room With Duplicate HostId', function (done) {
        const hostId = "ExampleHostId";
        const hostName = "ExampleName";
        rooms.push({host: {hostId, hostName}, status: RoomStatus.Active, players: []});

        RoomManager.generateRoom({hostId, hostName}, roomsRepository)
            .then(() => {
                done(new Error("Saved Rooms With Same Host " + JSON.stringify(rooms)))
            })
            .catch(err => {
                expect(err).to.be.instanceof(ApiError)
                expect(err.statusCode).to.be.equal(400)
                expect(err.message).to.deep.equal("Host Already Has Room");
                done()
            })
            .catch(err => done(err))
    });

    it('Should Save New Room If Other Existing Room Is Inactive', function (done) {
        const hostId = "ExampleHostId";
        const hostName = "ExampleName";
        const oldRoom = {host: {hostId, hostName}, status: RoomStatus.Disbanded, players: []};
        rooms.push(oldRoom);

        RoomManager.generateRoom({hostId, hostName}, roomsRepository)
            .then(result => {
                expect(rooms).to.have.members([result, oldRoom]);
                done()
            })
            .catch(err => done(err))
    });


    //TODO: Room With Same Auto Generated Id
})

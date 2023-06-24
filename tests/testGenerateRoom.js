const expect = require('chai').expect;
const RoomStatus = require("../src/RoomStatuses");
const ApiError = require("../src/Errors/ApiError");
const {setup, setupRoom} = require("./setups");

describe("testGenerateRoom", () => {
    
    it('Should Return New Room Successfully', function (done) {
        const {
            roomManager,
            socketManagerSpy,
            roomsRepository,
            host
        } = setup({});

        roomManager.generateRoom(socketManagerSpy)(host)
            .then(result => {
                expect(result).to.have.property("host").to.have.property("hostName").to.equal(host.hostName)
                expect(result).to.have.property("host").to.have.property("hostId").to.equal(host.hostId)
                expect(result).to.have.property("guest").to.equal(null)
                expect(result).to.have.property("roomId").matches(new RegExp("^.*-.*-.*$"))
                expect(result).to.have.property("roomStatus").to.equal(RoomStatus.Active)
                expect(result).to.have.property("categories").to.be.an("array").to.deep.equal(roomsRepository.getAllCategories())
                done()
            })
            .catch(err => {
                done(err)
            })
    });

    it('Should Save New Room', function (done) {
        const {
            roomManager,
            socketManagerSpy,
            roomsRepository,
            host
        } = setup({});

        roomManager.generateRoom(socketManagerSpy)(host)
            .then(() => roomsRepository.getActiveRoomByHostId(host.hostId))
            .then(result => {
                expect(result).to.be.not.undefined;
                done()
            })
            .catch(err => done(err))
    });


    it('Should Not Save Active Room With Duplicate HostId', function (done) {
        const {
            roomManager,
            socketManagerSpy,
            roomsRepository,
            host
        } = setup({rooms: [setupRoom({})]});

        roomManager.generateRoom(socketManagerSpy)(host, roomsRepository)
            .then(() => {
                done(new Error("Saved Rooms With Same Host "))
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
        const oldRoom = setupRoom({roomStatus: RoomStatus.Disbanded});
        const {
            roomManager,
            socketManagerSpy,
            roomsRepository,
            host
        } = setup({rooms: [oldRoom]});

        roomManager.generateRoom(socketManagerSpy)(host, roomsRepository)
            .then(result => {
                expect(roomsRepository.rooms).to.have.members([result, oldRoom]);
                done()
            })
            .catch(err => done(err))
    });

    it('Should Add Host Client To Room', function (done) {
        const {
            roomManager,
            socketManagerSpy,
            roomsRepository,
            emitSpy,
            host
        } = setup({});

        roomManager.generateRoom(socketManagerSpy)(host, roomsRepository)
            .then(() => {
                expect(emitSpy.calledOnce).to.be.true
                expect(emitSpy.getCall(0).args[0]).to.match(new RegExp("^.*-.*-.*$"))
                done()
            })
            .catch(err => done(err))
    });


    //TODO: Room With Same Auto Generated Id
})

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const socket_io_1 = require("socket.io");
const lib_1 = require("./lib");
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
const server = app.listen(8000, () => console.log('Server is up, 8000'));
const io = new socket_io_1.Server(server, { cors: { origin: '*' } });
let online = 0;
let roomArr = [];
io.on('connection', (socket) => {
    online++;
    io.emit('online', online);
    // on start
    socket.on('start', (cb) => {
        (0, lib_1.handelStart)(roomArr, socket, cb, io);
    });
    // On disconnection
    socket.on('disconnect', () => {
        online--;
        io.emit('online', online);
        (0, lib_1.handelDisconnect)(socket.id, roomArr, io);
    });
    /// ------- logic for webrtc connection ------
    // on ice send
    socket.on('ice:send', ({ candidate }) => {
        let type = (0, lib_1.getType)(socket.id, roomArr);
        if (type) {
            if (type?.type == 'p1') {
                typeof (type?.p2id) == 'string'
                    && io.to(type.p2id).emit('ice:reply', { candidate, from: socket.id });
            }
            else if (type?.type == 'p2') {
                typeof (type?.p1id) == 'string'
                    && io.to(type.p1id).emit('ice:reply', { candidate, from: socket.id });
            }
        }
    });
    // on sdp send
    socket.on('sdp:send', ({ sdp }) => {
        let type = (0, lib_1.getType)(socket.id, roomArr);
        if (type) {
            if (type?.type == 'p1') {
                typeof (type?.p2id) == 'string'
                    && io.to(type.p2id).emit('sdp:reply', { sdp, from: socket.id });
            }
            if (type?.type == 'p2') {
                typeof (type?.p1id) == 'string'
                    && io.to(type.p1id).emit('sdp:reply', { sdp, from: socket.id });
            }
        }
    });
    /// --------- Messages -----------
    // send message
    socket.on("send-message", (input, type, roomid) => {
        let displayType;
        if (type == 'p1')
            displayType = 'You: ';
        else if (type == 'p2')
            displayType = 'Stranger: ';
        else
            displayType = '';
        socket.to(roomid).emit('get-message', input, displayType);
    });
});

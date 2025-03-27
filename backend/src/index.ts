import express, { Application } from 'express';
import cors from 'cors';
import { Server as SocketIOServer } from 'socket.io';
import { Server } from 'socket.io';
import { Socket } from 'socket.io';
import { handelStart, handelDisconnect, getType } from './lib';
import { GetTypesResult, room } from './types';

const app: Application = express();
app.use(cors());

const server = app.listen(8000, () => console.log('Server is up, 8000'));
const io: Server = new SocketIOServer(server, { cors: { origin: '*' } });

let online: number = 0;
let roomArr: Array<room> = [];

io.on('connection', (socket: Socket) => {
  online++;
  io.emit('online', online);

  // on start
  socket.on('start', (cb: (type: string) => void) => {
    handelStart(roomArr, socket, cb, io);
  });

  // On disconnection
  socket.on('disconnect', () => {
    online--;
    io.emit('online', online);
    handelDisconnect(socket.id, roomArr, io);
  });

  /// ------- logic for webrtc connection ------

  // on ice send
  socket.on('ice:send', ({ candidate }: { candidate: any }) => {
    let type: GetTypesResult = getType(socket.id, roomArr);
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
  socket.on('sdp:send', ({ sdp }: { sdp: any }) => {
    let type = getType(socket.id, roomArr);
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
  socket.on("send-message", (input: string, type: 'p1' | 'p2', roomid: string) => {
    let displayType: string;
    if (type == 'p1') displayType = 'You: ';
    else if (type == 'p2') displayType = 'Stranger: ';
    else displayType = '';
    
    socket.to(roomid).emit('get-message', input, displayType);
  });
});
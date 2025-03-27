import { v4 as uuidv4 } from 'uuid';
import { GetTypesResult, room } from './types';
import { Socket, Server } from 'socket.io';

export function handelStart(
  roomArr: Array<room>, 
  socket: Socket, 
  cb: (type: string) => void, 
  io: Server
): void {
  // check available rooms
  let availableroom = checkAvailableRoom();
  if (availableroom.is) {
    socket.join(availableroom.roomid);
    cb('p2');
    closeRoom(availableroom.roomid);
    if (availableroom?.room) {
      // Add null check before emitting
      if (availableroom.room.p1.id) {
        io.to(availableroom.room.p1.id).emit('remote-socket', socket.id);
      }
      socket.emit('remote-socket', availableroom.room.p1.id);
      socket.emit('roomid', availableroom.room.roomid);
    }
  }
  // if no available room, create one
  else {
    let roomid = uuidv4();
    socket.join(roomid);
    roomArr.push({
      roomid,
      isAvailable: true,
      p1: {
        id: socket.id,
      },
      p2: {
        id: null,
      }
    });
    cb('p1');
    socket.emit('roomid', roomid);
  }

  /**
   * Close the room by setting isAvailable to false and setting p2 id
   * @param roomid - The ID of the room to close
   */
  function closeRoom(roomid: string): void {
    for (let i = 0; i < roomArr.length; i++) {
      if (roomArr[i].roomid == roomid) {
        roomArr[i].isAvailable = false;
        roomArr[i].p2.id = socket.id;
        break;
      }
    }
  }

  /**
   * Check for available rooms
   * @returns Object with room availability information
   */
  function checkAvailableRoom(): { is: boolean, roomid: string, room: room | null } {
    for (let i = 0; i < roomArr.length; i++) {
      if (roomArr[i].isAvailable) {
        return { is: true, roomid: roomArr[i].roomid, room: roomArr[i] };
      }
      if (roomArr[i].p1.id == socket.id || roomArr[i].p2.id == socket.id) {
        return { is: false, roomid: "", room: null };
      }
    }

    return { is: false, roomid: '', room: null };
  }
}

/**
 * Handle disconnection event
 * @param disconnectedId - Socket ID of the disconnected client
 * @param roomArr - Array of rooms
 * @param io - Socket.IO server instance
 */
export function handelDisconnect(
  disconnectedId: string, 
  roomArr: Array<room>, 
  io: Server
): void {
  for (let i = 0; i < roomArr.length; i++) {
    if (roomArr[i].p1.id == disconnectedId) {
      // Add null check before emitting
      if (roomArr[i].p2.id) {
        io.to(roomArr[i].p2.id!).emit("disconnected");
      }
      if (roomArr[i].p2.id) {
        roomArr[i].isAvailable = true;
        roomArr[i].p1.id = roomArr[i].p2.id;
        roomArr[i].p2.id = null;
      }
      else {
        roomArr.splice(i, 1);
      }
    } else if (roomArr[i].p2.id == disconnectedId) {
      // Add null check before emitting
      if (roomArr[i].p1.id) {
        io.to(roomArr[i].p1.id!).emit("disconnected");
      }
      if (roomArr[i].p1.id) {
        roomArr[i].isAvailable = true;
        roomArr[i].p2.id = null;
      }
      else {
        roomArr.splice(i, 1);
      }
    }
  }
}

/**
 * Get the type of participant (p1 or p2)
 * @param id - Socket ID to check
 * @param roomArr - Array of rooms
 * @returns Participant type information
 */
export function getType(id: string, roomArr: Array<room>): GetTypesResult {
  for (let i = 0; i < roomArr.length; i++) {
    if (roomArr[i].p1.id == id) {
        return { type: 'p1', p2id: roomArr[i].p2.id };
    } else if (roomArr[i].p2.id == id) {
      return { type: 'p2', p1id: roomArr[i].p1.id };
    }
  }

  return false;
}
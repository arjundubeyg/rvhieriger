const { v4: uuidv4 } = require('uuid');

/**
 * Handle start of a connection
 * @param {Array} roomArr 
 * @param {Object} socket 
 * @param {Function} cb 
 * @param {Object} io 
 */
function handelStart(roomArr, socket, cb, io) {
  // check available rooms
  let availableroom = checkAvailableRoom();
  if (availableroom.is) {
    socket.join(availableroom.roomid);
    cb('p2');
    closeRoom(availableroom.roomid);
    if (availableroom?.room) {
      io.to(availableroom.room.p1.id).emit('remote-socket', socket.id);
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
   * Close a room by marking it unavailable and setting p2 id
   * @param {string} roomid 
   */
  function closeRoom(roomid) {
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
   * @returns {Object} Room availability information
   */
  function checkAvailableRoom() {
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
 * @param {string} disconnectedId 
 * @param {Array} roomArr 
 * @param {Object} io 
 */
function handelDisconnect(disconnectedId, roomArr, io) {
  for (let i = 0; i < roomArr.length; i++) {
    if (roomArr[i].p1.id == disconnectedId) {
      io.to(roomArr[i].p2.id).emit("disconnected");
      if (roomArr[i].p2.id) {
        roomArr[i].isAvailable = true;
        roomArr[i].p1.id = roomArr[i].p2.id;
        roomArr[i].p2.id = null;
      }
      else {
        roomArr.splice(i, 1);
      }
    } else if (roomArr[i].p2.id == disconnectedId) {
      io.to(roomArr[i].p1.id).emit("disconnected");
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
 * Get the type of person (p1 or p2)
 * @param {string} id 
 * @param {Array} roomArr 
 * @returns {Object|boolean} 
 */
function getType(id, roomArr) {
  for (let i = 0; i < roomArr.length; i++) {
    if (roomArr[i].p1.id == id) {
        return { type: 'p1', p2id: roomArr[i].p2.id };
    } else if (roomArr[i].p2.id == id) {
      return { type: 'p2', p1id: roomArr[i].p1.id };
    }
  }

  return false;
}

module.exports = {
  handelStart,
  handelDisconnect,
  getType
};
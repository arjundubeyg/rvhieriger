// types.js
module.exports = {
    /**
     * @typedef {Object} room
     * @property {string} roomid
     * @property {boolean} isAvailable
     * @property {Object} p1
     * @property {string|null} p1.id
     * @property {Object} p2
     * @property {string|null} p2.id
     */
  
    /**
     * @typedef {Object} GetTypesResult
     * @property {'p1'|'p2'} [type]
     * @property {string|null} [p2id]
     * @property {string|null} [p1id]
     */
  };
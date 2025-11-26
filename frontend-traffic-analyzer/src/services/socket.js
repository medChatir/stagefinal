// services/socket.js
import { io } from 'socket.io-client';

let socket = null;

export function createSocket(baseUrl = 'http://localhost:5000', opts = {}) {
  if (!socket) {
    socket = io(baseUrl, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      ...opts
    });
  }
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function getSocket() {
  return socket;
}

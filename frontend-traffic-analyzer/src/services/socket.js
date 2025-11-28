// services/socket.js
import { io } from 'socket.io-client';

let socket = null;

// Configuration avec fallback
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

console.log('🔌 Socket URL:', SOCKET_URL);

export function createSocket(baseUrl = SOCKET_URL, opts = {}) {
  if (!socket) {
    console.log('🔌 Creating socket connection to:', baseUrl);
    socket = io(baseUrl, {
      transports: ['websocket', 'polling'], // Essayer websocket d'abord, puis polling
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 10000,
      ...opts
    });

    // Events de debug
    socket.on('connect', () => {
      console.log('✅ Socket connected:', socket.id);
    });

    socket.on('disconnect', (reason) => {
      console.log('❌ Socket disconnected:', reason);
    });

    socket.on('connect_error', (error) => {
      console.error('❌ Socket connection error:', error.message);
    });

    socket.on('error', (error) => {
      console.error('❌ Socket error:', error);
    });
  }
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    console.log('🔌 Disconnecting socket...');
    socket.disconnect();
    socket = null;
  }
}

export function getSocket() {
  return socket;
}
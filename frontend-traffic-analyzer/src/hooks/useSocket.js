// hooks/useSocket.js
import { useEffect, useRef, useState } from 'react';
import { createSocket, disconnectSocket } from '../services/socket';

export default function useSocket(enabled) {
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!enabled) {
      disconnectSocket();
      setConnected(false);
      return;
    }
    socketRef.current = createSocket();
    const s = socketRef.current;

    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);

    s.on('connect', onConnect);
    s.on('disconnect', onDisconnect);

    // returns cleanup
    return () => {
      if (s) {
        s.off('connect', onConnect);
        s.off('disconnect', onDisconnect);
        s.disconnect();
      }
    };
  }, [enabled]);

  // helper to subscribe to events from components
  const on = (event, cb) => {
    if (!socketRef.current) return () => {};
    socketRef.current.on(event, cb);
    return () => socketRef.current.off(event, cb);
  };

  const emit = (event, payload) => {
    if (!socketRef.current) return;
    socketRef.current.emit(event, payload);
  };

  return { connected, on, emit, socket: socketRef.current };
}

import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface SocketContextProps {
  socket: Socket | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextProps>({
  socket: null,
  isConnected: false,
});

export const useSocket = () => useContext(SocketContext);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);

  useEffect(() => {
    // Connect to backend server URL
    let backendUrl = import.meta.env.VITE_WS_URL;
    if (!backendUrl && import.meta.env.VITE_API_URL) {
      backendUrl = import.meta.env.VITE_API_URL.replace(/\/api\/?$/, '');
    }
    if (!backendUrl) {
      backendUrl = 'http://localhost:5000';
    }

    const socketInstance = io(backendUrl, {
      transports: ['websocket'],
      withCredentials: true,
    });

    socketInstance.on('connect', () => {
      console.log('Realtime WebSocket connected.');
      setIsConnected(true);
    });

    socketInstance.on('disconnect', () => {
      console.log('Realtime WebSocket disconnected.');
      setIsConnected(false);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};
export default SocketContext;

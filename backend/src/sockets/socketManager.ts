import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';

let io: Server | null = null;

export const initSocket = (server: HttpServer, frontendUrl: string): Server => {
  io = new Server(server, {
    cors: {
      origin: [frontendUrl, 'http://localhost:5173', 'http://localhost:3000'],
      methods: ['GET', 'POST', 'PATCH'],
      credentials: true
    }
  });

  io.on('connection', (socket: Socket) => {
    console.log(`Socket client connected: ${socket.id}`);

    socket.on('disconnect', () => {
      console.log(`Socket client disconnected: ${socket.id}`);
    });
  });

  return io;
};

export const getIO = (): Server => {
  if (!io) {
    throw new Error('Socket.io has not been initialized. Please call initSocket first.');
  }
  return io;
};

// Real-time notification helpers
export const broadcastEvent = (event: string, data: any) => {
  if (io) {
    io.emit(event, data);
    // Also emit a general refresh to the dashboard
    io.emit('dashboard:refresh', { timestamp: new Date() });
  }
};

import { io } from 'socket.io-client';

let socket = null;

// Initialize socket connection and join user personal room
export const initiateSocketConnection = (userId) => {
  if (socket) return socket;

  // Uses window.location.origin to support Vite proxy seamlessly
  socket = io(window.location.origin, {
    transports: ['websocket'],
    withCredentials: true
  });

  console.log('Socket connecting...');

  socket.on('connect', () => {
    console.log('Socket connected:', socket.id);
    socket.emit('join', userId);
  });

  return socket;
};

// Retrieve active socket instance
export const getSocket = () => {
  return socket;
};

// Disconnect from Socket.IO server
export const disconnectSocket = () => {
  if (socket) {
    console.log('Disconnecting socket...');
    socket.disconnect();
    socket = null;
  }
};

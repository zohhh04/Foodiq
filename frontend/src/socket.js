import { io } from 'socket.io-client';

let socket = null;

const createSocket = () => {
  const token = localStorage.getItem('token') || undefined;
  return io('http://localhost:5001', {
    withCredentials: true,
    auth: { token },
  });
};

export const getSocket = () => {
  if (!socket) socket = createSocket();
  return socket;
};

// Recreate the connection so it picks up a fresh auth token after login/logout.
// Components must read the socket inside their effect (via getSocket) so they
// bind to the current instance.
export const reconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  return getSocket();
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

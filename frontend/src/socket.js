import { io } from 'socket.io-client';

let socket = null;

const createSocket = () => {
  const token = localStorage.getItem('token') || undefined;
  // In production (Vercel Services, single domain) connect to the same
  // origin so /api + socket.io both hit the backend service via rewrites.
  // Set VITE_SOCKET_URL only if the backend lives on a separate domain.
  const url = import.meta.env.VITE_SOCKET_URL || undefined;
  return io(url, {
    withCredentials: true,
    auth: { token },
    transports: ['websocket'],
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

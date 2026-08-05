import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import api from '../api/client.js';
import { getSocket } from '../socket.js';
import { useAuth } from './AuthContext.jsx';

const NotificationContext = createContext(null);

// A stable per-browser pseudo token so the demo push flow works end-to-end
// without a real Firebase project (backend logs pushes in mock mode).
const getPushToken = () => {
  const key = 'foodiq_push_token';
  let token = localStorage.getItem(key);
  if (!token) {
    token = `web-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
    localStorage.setItem(key, token);
  }
  return token;
};

export function NotificationProvider({ children }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);

  const refresh = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await api.get('/notifications');
      setNotifications(data.data.notifications || []);
      setUnread(data.data.unread || 0);
    } catch {
      /* notifications optional */
    }
  }, [user]);

  // Register the device push token so staff status updates can reach us.
  useEffect(() => {
    if (!user) return;
    api.post('/notifications/token', { token: getPushToken() }).catch(() => {});
  }, [user]);

  // Load the notification list on auth change.
  useEffect(() => {
    setNotifications([]);
    setUnread(0);
    if (user) refresh();
  }, [user, refresh]);

  // Live notifications over the authenticated socket.
  useEffect(() => {
    if (!user) return;
    const socket = getSocket();
    const onNotification = (n) => {
      setNotifications((prev) => [n, ...prev]);
      setUnread((prev) => prev + 1);
    };
    socket.on('notification', onNotification);
    return () => socket.off('notification', onNotification);
  }, [user]);

  const markRead = useCallback(
    async (id) => {
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, read: true } : n))
      );
      setUnread((prev) => Math.max(0, prev - 1));
      try {
        await api.put(`/notifications/read/${id}`);
      } catch {
        refresh();
      }
    },
    [refresh]
  );

  const markAllRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnread(0);
    try {
      await api.put('/notifications/read-all');
    } catch {
      refresh();
    }
  }, [refresh]);

  return (
    <NotificationContext.Provider value={{ notifications, unread, refresh, markRead, markAllRead }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationContext);
}

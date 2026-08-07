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
  const [toast, setToast] = useState(null);

  const pushToast = useCallback((n) => setToast(n), []);

  const dismissToast = useCallback(() => setToast(null), []);

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
      pushToast(n);
    };
    socket.on('notification', onNotification);
    return () => socket.off('notification', onNotification);
  }, [user, pushToast]);

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
    <NotificationContext.Provider value={{ notifications, unread, refresh, markRead, markAllRead, toast, dismissToast }}>
      {children}

      {toast && (
        <div className="notify-toast" role="status">
          <div className="notify-toast-head">
            <span className="notify-toast-icon">🔔</span>
            <span className="notify-toast-title">{toast.title || 'Order update'}</span>
            <button className="notify-toast-close" onClick={dismissToast} aria-label="Dismiss">×</button>
          </div>
          {toast.body && <p className="notify-toast-body">{toast.body}</p>}
          {toast.data?.items?.length > 0 && (
            <ul className="notify-toast-items">
              {toast.data.items.map((it, idx) => (
                <li key={idx}>
                  <span>{it.qty}× {it.name}</span>
                </li>
              ))}
            </ul>
          )}
          <div className="notify-toast-meta">
            {toast.data?.tokenNumber && (
              <span className="notify-toast-token">Token #{toast.data.tokenNumber}</span>
            )}
            {toast.data?.pickupSlot && (
              <span className="notify-toast-slot">🕒 {toast.data.pickupSlot}</span>
            )}
            {toast.data?.total != null && (
              <span className="notify-toast-total">₹{toast.data.total}</span>
            )}
          </div>
          {toast.data?.status === 'completed' && (
            <>
              <div className="notify-toast-details">
                <span>Payment: <strong>{toast.data.paymentMethod || '—'}</strong></span>
                {toast.data.completedAt && (
                  <span>
                    Picked up: <strong>{new Date(toast.data.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong>
                  </span>
                )}
              </div>
              <p className="notify-toast-thanks">🙏 Thanks for ordering with Foodiq. Come back soon!</p>
            </>
          )}
        </div>
      )}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationContext);
}

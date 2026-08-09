import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
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
      if (n?._id) {
        setNotifications((prev) => [n, ...prev.filter((x) => x._id !== n._id)]);
        if (!n.read) setUnread((prev) => prev + 1);
      }
      if (n?.data?.status === 'placed') return; // cart shows the single payment confirmation modal
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

      {toast && (() => {
        const data = toast.data || {};
        const inferredStatus = data.status || (/placed/i.test(toast.title || '') ? 'placed' : '');
        const status = ['placed', 'preparing', 'ready', 'completed'].includes(inferredStatus)
          ? inferredStatus
          : 'order';
        const orderId = data.orderId;
        const tokenNumber = data.tokenNumber || (toast.title?.match(/#(\d+)/)?.[1] || '');
        const items = data.items || [];
        const steps = ['Placed', 'Preparing', 'Ready', 'Picked up'];
        const stepIndex = { placed: 1, preparing: 2, ready: 3, completed: 4 }[status] || 0;
        const methodLabel =
          data.paymentMethod === 'upi' ? 'UPI' :
          data.paymentMethod === 'card' ? 'Card' :
          data.paymentMethod === 'cash' ? 'Cash' : data.paymentMethod || '—';
        const confirm = () => dismissToast();

        return (
          <div className={`notify-toast notify-toast-${status}`} role="status">
            <span className="notify-toast-shine" aria-hidden="true" />
            {status === 'completed' && (
              <div className="notify-confetti" aria-hidden="true">
                <span /><span /><span /><span /><span /><span /><span /><span />
                <span /><span /><span /><span />
              </div>
            )}

            <div className="notify-toast-head">
              <span className="notify-toast-icon">
                {status === 'completed' ? '🎉' : status === 'ready' ? '🛎️' : '🔔'}
              </span>
              <span className="notify-toast-title">
                {status === 'ready'
                  ? 'Order ready for pickup!'
                  : status === 'completed'
                    ? 'Order delivered — enjoy!'
                    : (toast.title || 'Order update')}
              </span>
              <button className="notify-toast-close" onClick={dismissToast} aria-label="Dismiss">×</button>
            </div>

            {status === 'ready' && (
              <div className="notify-hero notify-hero-ready">
                <span className="notify-hero-emoji">🛎️</span>
                <div className="notify-hero-text">
                  <span className="notify-hero-eyebrow">Your food is ready</span>
                  <strong>Token #{tokenNumber}</strong>
                  <p>Please head to the pickup counter to collect your order.</p>
                </div>
                <span className="notify-hero-ping" aria-hidden="true"><i>↗</i></span>
              </div>
            )}

            {status === 'completed' && (
              <div className="notify-hero notify-hero-done">
                <span className="notify-hero-emoji">🎉</span>
                <div className="notify-hero-text">
                  <span className="notify-hero-eyebrow">Order picked up</span>
                  <strong>Enjoy your meal!</strong>
                </div>
              </div>
            )}

            {stepIndex > 0 && status !== 'completed' && (
              <div className="notify-steps" aria-hidden="true">
                {steps.map((label, i) => (
                  <span
                    key={label}
                    className={`notify-step${i + 1 < stepIndex ? ' is-done' : ''}${i + 1 === stepIndex ? ' is-active' : ''}`}
                  >
                    <i>{i + 1 < stepIndex ? '✓' : i + 1 === stepIndex ? '●' : '○'}</i>
                    {label}
                  </span>
                ))}
              </div>
            )}

            {toast.body && status !== 'ready' && status !== 'completed' && (
              <p className="notify-toast-body">{toast.body}</p>
            )}

            {items.length > 0 && status !== 'completed' && (
              <ul className="notify-toast-items">
                {items.map((it, idx) => (
                  <li key={idx}>
                    <span>{it.qty}× {it.name}</span>
                  </li>
                ))}
              </ul>
            )}

            <div className="notify-toast-meta">
              {tokenNumber && <span className="notify-toast-token">Token #{tokenNumber}</span>}
              {data.pickupSlot && <span className="notify-toast-slot">🕒 {data.pickupSlot}</span>}
              {data.total != null && <span className="notify-toast-total">₹{data.total}</span>}
            </div>

            {status === 'completed' && orderId && (
              <div className="notify-toast-rate">
                <span className="notify-toast-rate-text">Enjoyed it? Rate this order</span>
                <Link
                  to={`/rate/${orderId}`}
                  className="notify-toast-rate-btn"
                  onClick={confirm}
                >
                  Rate this order <span>★</span>
                </Link>
              </div>
            )}

            <div className="notify-toast-actions">
              {status === 'ready' && (
                <Link to="/queue" className="notify-toast-cta" onClick={confirm}>
                  Head to the counter <span>→</span>
                </Link>
              )}
              {status === 'preparing' && (
                <Link to="/queue" className="notify-toast-cta" onClick={confirm}>
                  Track my token <span>→</span>
                </Link>
              )}
              {status === 'completed' && (
                <Link to="/orders" className="notify-toast-cta" onClick={confirm}>
                  View my orders <span>→</span>
                </Link>
              )}
              {status === 'placed' && (
                <Link to="/queue" className="notify-toast-cta" onClick={confirm}>
                  Watch the live queue <span>→</span>
                </Link>
              )}
            </div>
          </div>
        );
      })()}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationContext);
}

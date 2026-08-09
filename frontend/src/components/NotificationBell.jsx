import { useEffect, useRef, useState } from 'react';
import { useNotifications } from '../context/NotificationContext.jsx';

const NOTIF_ICONS = {
  placed: '🔔',
  confirmed: '✅',
  preparing: '👨‍🍳',
  ready: '🛎️',
  completed: '🎉',
  cancelled: '❌',
  order: '🔔',
};

function timeAgo(ts) {
  const diff = Math.max(0, Date.now() - new Date(ts).getTime());
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.floor(hr / 24)}d ago`;
}

function NotificationBell() {
  const { notifications, unread, markRead, markAllRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const iconFor = (n) => NOTIF_ICONS[n?.data?.status] || NOTIF_ICONS[n?.type] || '🔔';

  return (
    <div className="notify-bell" ref={wrapRef}>
      <button
        className={`notify-bell-btn${unread > 0 ? ' has-unread' : ''}`}
        onClick={() => setOpen((v) => !v)}
        aria-label={`Notifications${unread ? ` (${unread} unread)` : ''}`}
        aria-expanded={open}
      >
        <span className="notify-bell-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
            <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
          </svg>
        </span>
        {unread > 0 && <span className="notify-bell-badge">{unread}</span>}
      </button>

      {open && (
        <div className="notify-dropdown">
          <div className="notify-dropdown-head">
            <span>Notifications</span>
            {unread > 0 && (
              <button className="notify-dropdown-mark" onClick={markAllRead}>
                Mark all read
              </button>
            )}
          </div>
          <div className="notify-dropdown-list">
            {notifications.length === 0 ? (
              <div className="notify-dropdown-empty">
                <span>🔕</span>
                <p>No notifications yet</p>
              </div>
            ) : (
              notifications.map((n) => (
                <button
                  key={n._id}
                  className={`notify-item${n.read ? '' : ' notify-item-unread'}`}
                  onClick={() => !n.read && markRead(n._id)}
                >
                  <span className="notify-item-icon">{iconFor(n)}</span>
                  <span className="notify-item-body">
                    <span className="notify-item-title">{n.title}</span>
                    {n.body && <span className="notify-item-text">{n.body}</span>}
                    <span className="notify-item-time">{timeAgo(n.createdAt)}</span>
                  </span>
                  {!n.read && <span className="notify-item-dot" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default NotificationBell;

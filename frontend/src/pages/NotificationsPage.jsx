import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useNotifications } from '../context/NotificationContext.jsx';

function NotificationsPage() {
  const { user } = useAuth();
  const { notifications, unread, refresh, markRead, markAllRead } = useNotifications();

  useEffect(() => {
    refresh();
  }, [refresh]);

  if (!user) {
    return (
      <div>
        <h1>Notifications</h1>
        <p>
          <Link to="/login">Login</Link> to see your order updates.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="notif-header">
        <h1>Notifications</h1>
        {unread > 0 && (
          <button className="btn-secondary notif-mark-all" onClick={markAllRead}>
            Mark all read
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <p>No notifications yet. Place an order to get live updates here.</p>
      ) : (
        <ul className="notif-list">
          {notifications.map((n) => (
            <li
              key={n._id}
              className={`notif-item${n.read ? '' : ' notif-item-unread'}`}
              onClick={() => !n.read && markRead(n._id)}
            >
              <div className="notif-item-top">
                <strong>{n.title}</strong>
                <span className="notif-time">{new Date(n.createdAt).toLocaleString()}</span>
              </div>
              {n.body && <p>{n.body}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default NotificationsPage;

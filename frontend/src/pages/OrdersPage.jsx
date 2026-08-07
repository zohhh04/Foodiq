import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client.js';
import { getSocket } from '../socket.js';
import { useAuth } from '../context/AuthContext.jsx';

function OrdersPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const ordersRef = useRef([]);

  useEffect(() => {
    if (!user) return;
    const socket = getSocket();
    api
      .get('/orders/mine')
      .then((res) => {
        ordersRef.current = res.data.data || [];
        setOrders(ordersRef.current);
        ordersRef.current.forEach((o) => socket.emit('join:order', o._id));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  // Live order status: staff updates flow straight into the list.
  useEffect(() => {
    if (!user) return;
    const socket = getSocket();
    const onOrderStatus = ({ orderId, status }) => {
      ordersRef.current = ordersRef.current.map((o) =>
        String(o._id) === String(orderId) ? { ...o, status } : o
      );
      setOrders(ordersRef.current);
    };
    socket.on('order:status', onOrderStatus);
    return () => socket.off('order:status', onOrderStatus);
  }, [user]);

  if (!user) {
    return (
      <div>
        <h1>My Orders</h1>
        <p>
          <Link to="/login">Login</Link> to view your orders.
        </p>
      </div>
    );
  }

  if (loading) return <p>Loading orders…</p>;

  return (
    <div>
      <div className="admin-page-head">
        <div className="admin-page-head-icon">🧾</div>
        <div>
          <h1>My Orders</h1>
          <p className="live-hint">Live: statuses update automatically as your food is prepared.</p>
        </div>
      </div>
      {orders.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <span>🍲</span>
          </div>
          <h2 className="empty-state-title">No orders yet</h2>
          <p className="empty-state-sub">
            Your order history will show up here — ready to reorder in one tap.
          </p>
          <Link to="/menu" className="empty-state-cta">
            Order Something <span>→</span>
          </Link>
        </div>
      ) : (
        <ul className="order-list">
          {orders.map((o) => (
            <li key={o._id} className="order-card">
              <div className="order-card-top">
                <span className="order-token">Token #{o.tokenNumber || '—'}</span>
                <span className={`status-badge status-${o.status}`}>{o.status}</span>
              </div>
              <p className="order-pay">
                {new Date(o.createdAt).toLocaleDateString()} · {o.paymentMethod} ·{' '}
                {o.paymentStatus} · <strong>₹{o.total}</strong>
              </p>
              {o.status === 'ready' && (
                <p className="order-ready-note">Ready for pickup at the counter! 🛎️</p>
              )}
              <ul className="order-items">
                {o.items.map((it, idx) => (
                  <li key={idx}>
                    <span>{it.qty}× {it.name}</span>
                    <span>₹{(it.price * it.qty).toFixed(2)}</span>
                  </li>
                ))}
              </ul>
              <div className="order-rate-row">
                <Link to={`/rate/${o._id}`} className="btn btn-primary shine">
                  Ratings <span>→</span>
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default OrdersPage;

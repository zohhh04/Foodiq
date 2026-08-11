import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client.js';
import { getSocket } from '../socket.js';
import { useAuth } from '../context/AuthContext.jsx';
import RatingStars from '../components/RatingStars.jsx';
import ItemThumb from '../components/ItemThumb.jsx';

function OrdersPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [ratingsByOrder, setRatingsByOrder] = useState({});
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

    api
      .get('/ratings/my')
      .then((res) => {
        const map = {};
        (res.data.data || []).forEach((r) => {
          const orderId =
            r.order && typeof r.order === 'object' ? r.order._id : r.order;
          if (orderId) map[String(orderId)] = r;
        });
        setRatingsByOrder(map);
      })
      .catch(() => {});
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

  const completedCount = orders.filter((o) => o.status === 'completed').length;
  const ratedCount = orders.filter((o) => ratingsByOrder[String(o._id)]).length;

  return (
    <div>
      <div className="orders-hero">
        <div className="orders-hero-icon">🧾</div>
        <div className="orders-hero-main">
          <div className="orders-hero-title-row">
            <h1>My Orders</h1>
            <span className="demand-live-badge">
              <span className="live-dot" /> Live
            </span>
          </div>
          <p className="live-hint">
            Statuses update automatically as your food is prepared.
          </p>
        </div>
        {orders.length > 0 && (
          <div className="orders-stats">
            <div className="orders-stat">
              <strong>{orders.length}</strong>
              <span>Orders</span>
            </div>
            <div className="orders-stat">
              <strong>{completedCount}</strong>
              <span>Completed</span>
            </div>
            <div className="orders-stat orders-stat-rated">
              <strong>{ratedCount}</strong>
              <span>Rated</span>
            </div>
          </div>
        )}
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
          {orders.map((o) => {
            const rated = ratingsByOrder[String(o._id)];
            return (
              <li key={o._id} className={`order-card order-card-${o.status}`}>
                <div className="order-card-top">
                  <div className="order-card-date">
                    <span className="order-card-date-icon">📅</span>
                    <span>
                      {new Date(o.createdAt).toLocaleDateString(undefined, {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short',
                      })}
                    </span>
                  </div>
                  <span className={`status-badge status-${o.status}`}>
                    {o.status}
                  </span>
                </div>
                <ul className="order-items lt-items-grid">
                  {o.items.map((it, idx) => (
                    <li key={idx}>
                      <ItemThumb image={it.foodItem?.image} name={it.name} />
                      <span className="lt-item-name">
                        <strong>{it.name}</strong>
                        <small>{it.qty}×</small>
                      </span>
                      <span className="lt-item-price">₹{(it.price * it.qty).toFixed(2)}</span>
                    </li>
                  ))}
                </ul>
                <div className="order-pay">
                  <span className="order-pay-method">
                    {o.paymentMethod === 'cash' ? '💵' : '💳'}{' '}
                    {o.paymentMethod}
                  </span>
                  <span className="order-pay-status">· {o.paymentStatus}</span>
                  <span className="order-pay-total">
                    <strong>₹{o.total}</strong>
                  </span>
                </div>
                {o.status === 'ready' && (
                  <p className="order-ready-note">
                    Ready for pickup at the counter! 🛎️
                  </p>
                )}
                <div className="order-rate-row">
                  {rated ? (
                    <div className="order-rated-chip">
                      <span className="order-rated-tick">✓</span>
                      <span className="order-rated-meta">
                        <span className="order-rated-stars">
                          <RatingStars value={rated.rating} size="sm" />
                          <strong>{rated.rating}.0</strong>
                        </span>
                        <span className="order-rated-label">You rated this order</span>
                      </span>
                    </div>
                  ) : o.status === 'delivered' || o.status === 'completed' ? (
                    <Link
                      to={`/rate/${o._id}`}
                      className="btn btn-primary shine"
                    >
                      Rate this order <span>★</span>
                    </Link>
                  ) : o.status === 'ready' ? (
                    <span className="order-rate-hint">
                      🛎️ Pick up your order, then rate it!
                    </span>
                  ) : (
                    <span className="order-rate-hint">
                      ⭐ You can rate after pickup
                    </span>
                  )}
                  {rated?.comment && <p className="order-rated-comment">“{rated.comment}”</p>}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default OrdersPage;

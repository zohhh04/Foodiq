import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client.js';
import { getSocket } from '../socket.js';
import { useAuth } from '../context/AuthContext.jsx';
import RatingStars from '../components/RatingStars.jsx';

function RateOrder({ order, myRating, onRated }) {
  const [rating, setRating] = useState(myRating?.rating || 0);
  const [comment, setComment] = useState(myRating?.comment || '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (myRating) {
    return (
      <div className="order-rating done">
        <p>You rated this order:</p>
        <RatingStars value={myRating.rating} size="sm" />
        {myRating.comment && <p className="rating-comment">"{myRating.comment}"</p>}
      </div>
    );
  }

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!rating) {
      setError('Pick a star rating first.');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/ratings', { order: order._id, rating, comment });
      onRated(order._id, { rating, comment });
    } catch (err) {
      setError(err.response?.data?.message || 'Could not submit rating.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="order-rating" onSubmit={submit}>
      <p>How was your order?</p>
      <RatingStars value={rating} onChange={setRating} />
      {error && <p className="auth-error">{error}</p>}
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Share a quick comment (optional)…"
        rows={2}
      />
      <button type="submit" disabled={submitting}>
        {submitting ? 'Submitting…' : 'Submit Rating'}
      </button>
    </form>
  );
}

function OrdersPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ratedMap, setRatedMap] = useState({});
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
          if (r.order) map[String(r.order)] = r;
        });
        setRatedMap(map);
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

  const handleRated = (orderId, rating) => {
    setRatedMap((prev) => ({ ...prev, [String(orderId)]: rating }));
  };

  if (!user) {
    return (
      <div>
        <h1>My Orders</h1>
        <p>
          <Link to="/login">Sign in</Link> to view your orders.
        </p>
      </div>
    );
  }

  if (loading) return <p>Loading orders…</p>;

  return (
    <div>
      <h1>My Orders</h1>
      <p className="live-hint">Live: statuses update automatically.</p>
      {orders.length === 0 ? (
        <p>
          No orders yet. <Link to="/menu">Order something</Link>.
        </p>
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
                {o.paymentStatus} · ₹{o.total}
              </p>
              {o.status === 'ready' && (
                <p className="order-ready-note">Ready for pickup at the counter!</p>
              )}
              <ul className="order-items">
                {o.items.map((it, idx) => (
                  <li key={idx}>
                    {it.qty}× {it.name} — ₹{(it.price * it.qty).toFixed(2)}
                  </li>
                ))}
              </ul>
              {o.status === 'completed' && (
                <RateOrder
                  order={o}
                  myRating={ratedMap[String(o._id)]}
                  onRated={handleRated}
                />
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default OrdersPage;

import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../api/client.js';
import { getSocket } from '../socket.js';
import { useAuth } from '../context/AuthContext.jsx';
import RatingStars from '../components/RatingStars.jsx';

const TAX_RATE = 0.05;

function RatingPage() {
  const { orderId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [myRating, setMyRating] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!user) return;
    let active = true;
    api
      .get(`/orders/${orderId}`)
      .then((res) => {
        if (active) setOrder(res.data.data);
      })
      .catch((err) => {
        if (active) setError(err.response?.data?.message || 'Could not load this order.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    api
      .get('/ratings/my')
      .then((res) => {
        const found = (res.data.data || []).find((r) => String(r.order) === String(orderId));
        if (found && active) {
          setMyRating(found);
          setRating(found.rating);
          setComment(found.comment || '');
        }
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [user, orderId]);

  useEffect(() => {
    if (!user) return;
    const socket = getSocket();
    socket.emit('join:order', orderId);
    const onStatus = ({ orderId: id, status }) => {
      if (String(id) === String(orderId)) {
        setOrder((prev) => (prev ? { ...prev, status } : prev));
      }
    };
    socket.on('order:status', onStatus);
    return () => socket.off('order:status', onStatus);
  }, [user, orderId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!rating) {
      setError('Please pick a star rating first.');
      return;
    }
    setSubmitting(true);
    try {
      const { data } = await api.post('/ratings', { order: orderId, rating, comment });
      setMyRating(data.data);
      setDone(true);
    } catch (err) {
      if (err.response?.status === 409) {
        setDone(true);
      } else {
        setError(err.response?.data?.message || 'Could not submit rating.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <p>Loading order…</p>;

  if (!order && error) {
    return (
      <div className="rating-page">
        <div className="rating-card">
          <div className="rating-hero-icon">😕</div>
          <h1>Rating unavailable</h1>
          <p className="rating-sub">{error}</p>
          <Link to="/orders" className="rating-back">← Back to my orders</Link>
        </div>
      </div>
    );
  }

  if (myRating || done) {
    return (
      <div className="rating-page">
        <div className="rating-card rating-success">
          <div className="rating-success-tick">
            <svg viewBox="0 0 52 52">
              <circle cx="26" cy="26" r="25" fill="none" />
              <path fill="none" d="M14 27l8 8 16-16" />
            </svg>
          </div>
          <h1>Thanks for your feedback!</h1>
          <p className="rating-sub">
            {done
              ? 'Your rating has been submitted. It helps us serve you better.'
              : 'You already rated this order. Here is what you shared.'}
          </p>
          {myRating && (
            <div className="rating-thankyou-stars">
              <RatingStars value={myRating.rating} size="md" />
              {myRating.comment && <p className="rating-comment">"{myRating.comment}"</p>}
            </div>
          )}
          <div className="rating-actions">
            <button className="btn btn-primary shine" onClick={() => navigate('/orders')}>
              Back to My Orders <span>→</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  const items = order?.items || [];
  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
  const tax = Math.round(subtotal * TAX_RATE * 100) / 100;
  const total = order?.total ?? Math.round((subtotal + tax) * 100) / 100;

  return (
    <div className="rating-page">
      <div className="rating-card">
        <div className="rating-hero">
          <div className="rating-hero-icon">⭐</div>
          <div>
            <h1>Rate your order</h1>
            <p className="rating-sub">
              How was your food today? Your feedback shapes the menu.
            </p>
          </div>
        </div>

        {order && order.status !== 'completed' ? (
          <div className="rating-waiting">
            <div className="rating-spinner" aria-hidden="true" />
            <p>
              This order is <strong>{order.status}</strong>. You can rate it once it's completed.
            </p>
            <p className="rating-waiting-hint">This page updates live — no refreshing needed.</p>
            <Link to="/orders" className="rating-back">← Back to my orders</Link>
          </div>
        ) : (
          <>
            <div className="rating-order-summary">
              <div className="rating-order-head">
                <span className="order-token">Token #{order?.tokenNumber || '—'}</span>
                <span className={`status-badge status-${order?.status}`}>{order?.status}</span>
              </div>
              <ul className="order-items">
                {items.map((it, idx) => (
                  <li key={idx}>
                    <span>{it.qty}× {it.name}</span>
                    <span>₹{(it.price * it.qty).toFixed(2)}</span>
                  </li>
                ))}
              </ul>
              <div className="rating-order-total">
                <span>Order total</span>
                <strong>₹{Number(total).toFixed(2)}</strong>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="rating-form">
              <div className="rating-question">How was your overall experience?</div>
              <RatingStars value={rating} onChange={setRating} size="lg" />
              {error && <p className="auth-error">{error}</p>}
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Share a quick comment (optional)…"
                rows={3}
              />
              <div className="rating-actions">
                <button type="submit" className="btn btn-primary shine" disabled={submitting}>
                  {submitting ? 'Submitting…' : 'Submit Rating'} <span>→</span>
                </button>
                <Link to="/orders" className="rating-skip">Skip for now</Link>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

export default RatingPage;

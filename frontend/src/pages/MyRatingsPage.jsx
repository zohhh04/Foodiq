import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import RatingStars from '../components/RatingStars.jsx';

function MyRatingsPage() {
  const { user } = useAuth();
  const [ratings, setRatings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    api
      .get('/ratings/my')
      .then((res) => setRatings(res.data.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  if (loading) return <p>Loading your ratings…</p>;

  const orderOf = (r) => (typeof r.order === 'object' && r.order ? r.order : null);
  const itemName = (r) =>
    typeof r.foodItem === 'object' && r.foodItem ? r.foodItem.name : null;

  return (
    <div>
      <div className="admin-page-head">
        <div className="admin-page-head-icon">⭐</div>
        <div>
          <h1>My Ratings</h1>
          <p className="live-hint">Everything you've shared after picking up an order.</p>
        </div>
      </div>

      {ratings.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <span>⭐</span>
          </div>
          <h2 className="empty-state-title">No ratings yet</h2>
          <p className="empty-state-sub">
            Once your orders are completed you can rate them here.
          </p>
          <Link to="/menu" className="empty-state-cta">
            Browse the Menu <span>→</span>
          </Link>
        </div>
      ) : (
        <ul className="order-list">
          {ratings.map((r) => {
            const order = orderOf(r);
            return (
              <li key={r._id} className="order-card">
                <div className="order-card-top">
                  <span className="order-token">
                    Token #{order?.tokenNumber || '—'}
                  </span>
                  <span className="myrating-stars">
                    <RatingStars value={r.rating} size="sm" />
                    <strong>{r.rating}/5</strong>
                  </span>
                </div>
                <p className="order-pay">
                  {order
                    ? new Date(order.createdAt).toLocaleDateString()
                    : new Date(r.createdAt).toLocaleDateString()}
                  {order?.total != null && <> · <strong>₹{order.total.toFixed(2)}</strong></>}
                </p>
                {itemName(r) && (
                  <p className="myrating-item">for {itemName(r)}</p>
                )}
                {r.comment && (
                  <p className="myrating-comment">"{r.comment}"</p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default MyRatingsPage;

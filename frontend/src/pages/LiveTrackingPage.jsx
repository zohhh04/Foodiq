import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client.js';
import { getSocket } from '../socket.js';
import { useAuth } from '../context/AuthContext.jsx';
import ItemThumb from '../components/ItemThumb.jsx';

const STEP_DEFS = [
  { key: 'placed', label: 'Order Received', icon: '📥' },
  { key: 'preparing', label: 'Preparing', icon: '👨‍🍳' },
  { key: 'ready', label: 'Ready for Pickup', icon: '🛎️' },
  { key: 'completed', label: 'Picked Up', icon: '🛍️' },
];

const STATUS_STEP = { placed: 0, confirmed: 0, preparing: 1, ready: 2, delivered: 3, completed: 3 };

const PAY_LABEL = { upi: 'UPI', card: 'Card', cash: 'Cash' };

function LiveTrackingPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const activeRef = useRef(null);

  useEffect(() => {
    if (!user) return;
    api
      .get('/orders/mine')
      .then((res) => {
        const list = res.data.data || [];
        activeRef.current = list.find((o) => !['delivered', 'completed', 'cancelled'].includes(o.status));
        setOrders(list);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  const active = orders.find((o) => String(o._id) === String(activeRef.current?._id)) || activeRef.current;

  // Live status updates straight from the kitchen.
  useEffect(() => {
    if (!user || !active) return;
    const socket = getSocket();
    socket.emit('join:order', active._id);
    const onStatus = ({ orderId, status }) => {
      if (String(orderId) !== String(active._id)) return;
      const next = { ...activeRef.current, status };
      activeRef.current = next;
      setOrders((prev) => prev.map((o) => (String(o._id) === String(orderId) ? next : o)));
    };
    socket.on('order:status', onStatus);
    return () => socket.off('order:status', onStatus);
  }, [user, active]);

  if (!user) {
    return (
      <div>
        <h1>Live Tracking</h1>
        <p>
          <Link to="/login">Login</Link> to track your orders.
        </p>
      </div>
    );
  }

  if (loading) return <p>Loading live tracking…</p>;

  const stepIdx = STATUS_STEP[active?.status] ?? -1;
  const statusLabel = (active?.status || 'placed').toUpperCase();
  const placedTime = active?.createdAt
    ? new Date(active.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    : '—';
  const queueLabel = active?.queuePosition ? `#${active.queuePosition}` : '—';
  const waitLabel = active?.estimatedWaitMin
    ? `~${active.estimatedWaitMin} min`
    : active?.status === 'ready'
      ? 'Ready now'
      : '—';

  return (
    <div>
      <div className="orders-hero">
        <div className="orders-hero-icon">🛰️</div>
        <div className="orders-hero-main">
          <div className="orders-hero-title-row">
            <h1>Live Tracking</h1>
            <span className="demand-live-badge">
              <span className="live-dot" /> LIVE
            </span>
          </div>
          <p className="live-hint">
            Your order, tracked in real time from kitchen to counter.
          </p>
        </div>
        {active && (
          <div className="orders-stats">
            <div className="orders-stat">
              <strong>#{active.tokenNumber || '—'}</strong>
              <span>Token</span>
            </div>
            <div className="orders-stat">
              <strong>{active.items?.length || 0}</strong>
              <span>Items</span>
            </div>
            <div className="orders-stat orders-stat-rated">
              <strong>₹{active.total}</strong>
              <span>Total</span>
            </div>
          </div>
        )}
      </div>

      {!active ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <span>🛰️</span>
          </div>
          <h2 className="empty-state-title">No active order</h2>
          <p className="empty-state-sub">
            Place an order and it will appear here — watch every step from the kitchen to the
            pickup counter.
          </p>
          <Link to="/menu" className="empty-state-cta">
            Order Something <span>→</span>
          </Link>
          <div className="empty-state-hint">
            Tracking switches on automatically the moment your payment goes through.
          </div>
        </div>
      ) : (
        <div className="lt-card lt-track">
          <div className="lt-track-head">
            <div className="order-token-box">
              <span className="order-token-label">Order Number</span>
              <span className="order-token">#{active.tokenNumber || '—'}</span>
            </div>
            <div className="lt-track-kitchen">
              <span className="lt-track-kitchen-avatar">🛰️</span>
              <div className="order-customer-info">
                <strong>Kitchen Workflow</strong>
                <span className="lt-track-status">STATUS: {statusLabel}</span>
              </div>
            </div>
            <span className={`status-badge status-${active.status}`}>{active.status}</span>
          </div>

          <div className="lt-track-stats">
            <div className="lt-track-stat">
              <span className="lt-track-stat-icon">🧾</span>
              <div>
                <strong>{active.items?.length || 0}</strong>
                <span>Items</span>
              </div>
            </div>
            <div className="lt-track-stat">
              <span className="lt-track-stat-icon">{active.paymentMethod === 'cash' ? '💵' : '💳'}</span>
              <div>
                <strong>{PAY_LABEL[active.paymentMethod] || active.paymentMethod}</strong>
                <span>Payment</span>
              </div>
            </div>
            <div className="lt-track-stat">
              <span className="lt-track-stat-icon">💰</span>
              <div>
                <strong>₹{active.total}</strong>
                <span>Total</span>
              </div>
            </div>
            <div className="lt-track-stat">
              <span className="lt-track-stat-icon">🕒</span>
              <div>
                <strong>{active.pickupSlot || '—'}</strong>
                <span>Pickup slot</span>
              </div>
            </div>
          </div>

          <div className="lt-steps-wrap">
            <ol className="lt-steps">
              {STEP_DEFS.map((s, i) => {
                const done = i < stepIdx;
                const activeStep = i === stepIdx;
                return (
                  <li
                    key={s.key}
                    className={`lt-step${done ? ' is-done' : ''}${activeStep ? ' is-active' : ''}`}
                  >
                    <span className="lt-step-rail" aria-hidden="true" />
                    <span className="lt-step-dot">
                      <i>{done ? '✓' : s.icon}</i>
                    </span>
                    <span className="lt-step-label">{s.label}</span>
                    {activeStep && <span className="lt-step-ping" aria-hidden="true" />}
                  </li>
                );
              })}
            </ol>
          </div>

          <div className="lt-track-body">
            <div className="lt-track-items">
              <div className="lt-items-head">
                <strong>Items</strong>
                <span>{active.items?.length || 0} item{(active.items?.length || 0) > 1 ? 's' : ''}</span>
              </div>
              <ul className="order-items lt-items-grid">
                {(active.items || []).map((it, idx) => (
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
            </div>

            <div className="lt-track-side">
              <div className="lt-track-summary">
                <div className="order-pay">
                  <span className="order-pay-method">
                    {active.paymentMethod === 'cash' ? '💵' : '💳'}{' '}
                    {PAY_LABEL[active.paymentMethod] || active.paymentMethod}
                  </span>
                  <span className="order-pay-status">· {active.paymentStatus}</span>
                  <span className="order-pay-total">
                    <strong>₹{active.total}</strong>
                  </span>
                </div>

                {active.status === 'ready' && (
                  <p className="order-ready-note">Ready for pickup at the counter! 🛎️</p>
                )}

                <div className="lt-summary-bill">
                  <div className="lt-summary-bill-head">
                    <strong>Bill details</strong>
                    <span>{active.items?.length || 0} item{(active.items?.length || 0) > 1 ? 's' : ''}</span>
                  </div>
                  <div className="lt-summary-bill-row">
                    <span>Subtotal</span>
                    <strong>₹{(active.subtotal || 0).toFixed(2)}</strong>
                  </div>
                  <div className="lt-summary-bill-row">
                    <span>Tax (5%)</span>
                    <strong>₹{(active.tax || 0).toFixed(2)}</strong>
                  </div>
                  <div className="lt-summary-bill-row lt-summary-bill-total">
                    <span>Total</span>
                    <strong>₹{(active.total || 0).toFixed(2)}</strong>
                  </div>
                </div>

                <div className="lt-summary-info">
                  <div className="lt-summary-info-cell">
                    <span>Queue</span>
                    <strong>{queueLabel}</strong>
                  </div>
                  <div className="lt-summary-info-cell">
                    <span>Est. wait</span>
                    <strong>{waitLabel}</strong>
                  </div>
                  <div className="lt-summary-info-cell">
                    <span>Placed</span>
                    <strong>{placedTime}</strong>
                  </div>
                </div>

                <div className="lt-track-foot">
                  <Link to="/orders" className="order-foot-link">View all orders →</Link>
                  <span className="order-foot-updated">Updates live — no refreshing needed</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default LiveTrackingPage;

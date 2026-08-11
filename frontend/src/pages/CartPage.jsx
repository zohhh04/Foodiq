import { useEffect, useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import api from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';

const TAX_RATE = 0.05;

function CartPage() {
  const { user } = useAuth();
  const { refresh: refreshCart } = useCart();
  const navigate = useNavigate();
  const location = useLocation();

  const fmtTime = (d) =>
    d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });

  const toAmPm = (t) => {
    if (!t) return '';
    const [h, m] = t.split(':').map(Number);
    if (!Number.isFinite(h) || !Number.isFinite(m)) return t;
    const mer = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${h12}:${String(m).padStart(2, '0')} ${mer}`;
  };

  const initialSlotPreset = location.state?.pickupSlot || '30';

  const formatPresetSlot = (preset) => {
    if (!preset) return '';
    const mins = parseInt(preset, 10);
    if (!Number.isFinite(mins) || mins <= 0) return '';
    const now = new Date();
    const to = new Date(now.getTime() + mins * 60000);
    return `Within ${mins} min (${fmtTime(now)}–${fmtTime(to)})`;
  };

  const initialSlotConfirmed = Boolean(location.state?.pickupSlot) && initialSlotPreset !== 'custom';
  const initialConfirmedSlot = initialSlotConfirmed
    ? formatPresetSlot(initialSlotPreset) || location.state?.pickupSlotLabel || ''
    : '';

  const initialSlotAt = (() => {
    const mins = parseInt(initialSlotPreset, 10);
    return Number.isFinite(mins) && mins > 0 ? new Date() : null;
  })();

  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState('');
  const [paid, setPaid] = useState(null);
  const [slotPreset, setSlotPreset] = useState(initialSlotPreset);
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [slotConfirmed, setSlotConfirmed] = useState(initialSlotConfirmed);
  const [confirmedSlot, setConfirmedSlot] = useState(initialConfirmedSlot);
  const [slotAt, setSlotAt] = useState(initialSlotAt);
  const [showModal, setShowModal] = useState(false);

  const presetOptions = [
    { value: '30', label: 'Within 30 min' },
    { value: '60', label: 'Within 1 hour' },
    { value: '90', label: 'Within 1.5 hours' },
    { value: 'custom', label: 'Custom time slot' },
  ];

  const getPickupSlot = () => {
    if (slotPreset === 'custom') {
      if (!customFrom || !customTo) return '';
      if (customFrom >= customTo) return '';
      return `Custom pickup ${toAmPm(customFrom)}–${toAmPm(customTo)}`;
    }
    const mins = parseInt(slotPreset, 10);
    if (!Number.isFinite(mins) || mins <= 0) return 'Within 30 min';
    const now = new Date();
    const to = new Date(now.getTime() + mins * 60000);
    return `Within ${mins} min (${fmtTime(now)}–${fmtTime(to)})`;
  };

  const getPickupSlotAt = () => {
    const now = new Date();
    if (slotPreset === 'custom') {
      if (!customFrom || !customTo) return null;
      const [h, m] = customFrom.split(':').map(Number);
      return new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0, 0);
    }
    const mins = parseInt(slotPreset, 10);
    return Number.isFinite(mins) && mins > 0 ? now : null;
  };

  const slotPreview = getPickupSlot();

  const loadCart = () =>
    api
      .get('/cart')
      .then((res) => setCart(res.data.data))
      .finally(() => setLoading(false));

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    loadCart();
  }, [user]);

  const changeQty = (id, qty) => {
    setCart((c) => ({
      ...c,
      items:
        qty <= 0
          ? c.items.filter((i) => String(i.foodItem._id) !== String(id))
          : c.items.map((i) =>
              String(i.foodItem._id) === String(id) ? { ...i, qty } : i
            ),
    }));
    api.put(`/cart/${id}`, { qty }).then(refreshCart);
  };

  const removeItem = (id) => {
    changeQty(id, 0);
  };

  const handleConfirmSlot = () => {
    setError('');
    const slot = getPickupSlot();
    if (!slot) {
      setError('Please pick a pickup time slot — for a custom range fill in both From and To times.');
      return;
    }
    setConfirmedSlot(slot);
    setSlotAt(getPickupSlotAt());
    setSlotConfirmed(true);
  };

  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    setError('');
    setPlacing(true);
    try {
      const paymentMethod = e.target.payment.value;
      const { data } = await api.post('/orders', {
        paymentMethod,
        pickupSlot: confirmedSlot,
        pickupSlotAt: slotAt ? slotAt.toISOString() : undefined,
      });
      refreshCart();
      setCart({ items: [], subtotal: 0, tax: 0, total: 0 });
      setPaid({ confirmation: data.data, method: paymentMethod });
      setShowModal(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not place order.');
      setCart(null);
      loadCart();
    } finally {
      setPlacing(false);
    }
  };

  const continueToQueue = () => {
    if (!paid) return;
    navigate('/queue', { state: { confirmation: paid.confirmation } });
  };

  if (loading) return <p>Loading cart…</p>;

  if (!user) {
    return (
      <div>
        <h1>Your Cart</h1>
        <p>
          <Link to="/login">Login</Link> to view your cart.
        </p>
      </div>
    );
  }

  const items = cart?.items || [];
  const itemCount = items.reduce((s, i) => s + i.qty, 0);
  const subtotal = items.reduce((s, i) => s + i.foodItem.price * i.qty, 0);
  const tax = Math.round(subtotal * TAX_RATE * 100) / 100;
  const total = Math.round((subtotal + tax) * 100) / 100;

  return (
    <div>
      <div className="orders-hero">
        <div className="orders-hero-icon">🛒</div>
        <div className="orders-hero-main">
          <div className="orders-hero-title-row">
            <h1>Your Cart</h1>
            <span className="demand-live-badge">
              <span className="live-dot" /> Ready
            </span>
          </div>
          <p className="live-hint">
            Review your items, pick a pickup slot, and check out.
          </p>
        </div>
        {items.length > 0 && (
          <div className="orders-stats">
            <div className="orders-stat">
              <strong>{itemCount}</strong>
              <span>Items</span>
            </div>
            <div className="orders-stat">
              <strong>₹{subtotal.toFixed(2)}</strong>
              <span>Subtotal</span>
            </div>
            <div className="orders-stat orders-stat-rated">
              <strong>₹{total.toFixed(2)}</strong>
              <span>Total</span>
            </div>
          </div>
        )}
      </div>
      {error && <p className="auth-error">{error}</p>}

      {items.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <span>🛒</span>
          </div>
          <h2 className="empty-state-title">Your cart is feeling light</h2>
          <p className="empty-state-sub">
            Looks like you haven't added anything yet. Your next favourite dish is just a click away.
          </p>
          <Link to="/menu" className="empty-state-cta">
            Browse the Menu <span>→</span>
          </Link>
          <div className="empty-state-hint">Craving something? Search the menu to find it.</div>
        </div>
      ) : (
        <div className="cart-layout">
          <div className="cart-main">
            <ul className="cart-list">
              {items.map((i) => (
                <li key={i.foodItem._id} className="cart-item">
                  <div className="cart-item-thumb">
                    {i.foodItem.image ? (
                      <img src={i.foodItem.image} alt={i.foodItem.name} loading="lazy" />
                    ) : (
                      <span className="cart-item-emoji">🍽️</span>
                    )}
                  </div>
                  <div className="cart-item-info">
                    <strong>{i.foodItem.name}</strong>
                    {i.foodItem.description && (
                      <span className="cart-item-desc">{i.foodItem.description}</span>
                    )}
                    <div className="cart-item-price-row">
                      <span className="cart-item-unit">₹{i.foodItem.price.toFixed(2)} each</span>
                      <span className="cart-item-price">₹{(i.foodItem.price * i.qty).toFixed(2)}</span>
                    </div>
                  </div>
                  <div className="cart-item-actions">
                    <button onClick={() => changeQty(i.foodItem._id, i.qty - 1)} aria-label="Decrease">−</button>
                    <span className="cart-item-qty">{i.qty}</span>
                    <button onClick={() => changeQty(i.foodItem._id, i.qty + 1)} aria-label="Increase">+</button>
                    <button className="remove" onClick={() => removeItem(i.foodItem._id)}>
                      Remove
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="cart-summary">
            <div className="summary-head">
              <h2>Order Summary</h2>
              <span className="summary-items">{itemCount} item{itemCount > 1 ? 's' : ''}</span>
            </div>
            <div className="summary-rows">
              <div className="summary-row"><span>Subtotal</span><span>₹{subtotal.toFixed(2)}</span></div>
              <div className="summary-row"><span>Tax (5%)</span><span>₹{tax.toFixed(2)}</span></div>
              <div className="summary-row"><span>Pickup slot</span><span className="summary-slot">{slotConfirmed ? confirmedSlot : (slotPreview || '—')}</span></div>
              <div className="summary-row summary-save"><span>Delivery</span><span>FREE</span></div>
              <div className="summary-row summary-total"><span>Total</span><span>₹{total.toFixed(2)}</span></div>
            </div>

            <form className="checkout-form" onSubmit={slotConfirmed ? handlePlaceOrder : (e) => e.preventDefault()}>
              {!slotConfirmed ? (
                <>
                  <label className="checkout-label">
                    <span>Pickup time slot</span>
                    <select
                      name="slot"
                      value={slotPreset}
                      onChange={(e) => setSlotPreset(e.target.value)}
                    >
                      {presetOptions.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </label>
                  {slotPreset === 'custom' && (
                    <div className="slot-custom">
                      <label className="checkout-label">
                        <span>From</span>
                        <input
                          type="time"
                          value={customFrom}
                          onChange={(e) => setCustomFrom(e.target.value)}
                        />
                      </label>
                      <label className="checkout-label">
                        <span>To</span>
                        <input
                          type="time"
                          value={customTo}
                          onChange={(e) => setCustomTo(e.target.value)}
                        />
                      </label>
                    </div>
                  )}
                  <div className="slot-preview">
                    <span>🕒 {slotPreview || 'Select a slot above'}</span>
                  </div>
                  <button type="button" onClick={handleConfirmSlot}>
                    Confirm slot <span>→</span>
                  </button>
                </>
              ) : (
                <>
                  <div className="slot-confirmed">
                    <span className="slot-confirmed-tick">✓</span>
                    <div className="slot-confirmed-text">
                      <strong>Slot confirmed</strong>
                      <p>🕒 {confirmedSlot}</p>
                    </div>
                    <button type="button" className="slot-edit-btn" onClick={() => setSlotConfirmed(false)}>
                      Edit
                    </button>
                  </div>
                  <label className="checkout-label">
                    <span>Payment method</span>
                    <select name="payment" defaultValue="upi">
                      <option value="upi">UPI</option>
                      <option value="card">Card</option>
                      <option value="cash">Cash at counter</option>
                    </select>
                  </label>
                  <button type="submit" disabled={placing}>
                    {placing ? 'Placing order…' : 'Place Order'} <span>→</span>
                  </button>
                </>
              )}
            </form>
            <p className="checkout-note">🔒 Secure checkout · Cancel anytime before pickup</p>
          </div>
        </div>
      )}

      {paid && showModal && (() => {
        const confToken = paid.confirmation.token || {};
        const confOrder = paid.confirmation.order || {};
        const tokenNumber = confToken.tokenNumber ?? confOrder.tokenNumber;
        const waitMin = confToken.estimatedWaitMin ?? confOrder.estimatedWaitMin;
        const position = confToken.position ?? confOrder.queuePosition;
        const amountPaid = confOrder.total != null ? confOrder.total : total;

        return (
          <div className="pay-overlay" onClick={() => setShowModal(false)}>
            <div className="pay-modal" onClick={(e) => e.stopPropagation()}>
              <button className="pay-modal-close" onClick={() => setShowModal(false)} aria-label="Dismiss">×</button>
              <div className={`pay-tick${paid.method === 'cash' ? ' pay-tick-cash' : ''}`}>
                {paid.method === 'cash' ? (
                  <span className="pay-cash">₹</span>
                ) : (
                  <svg viewBox="0 0 52 52">
                    <circle cx="26" cy="26" r="25" fill="none" />
                    <path fill="none" d="M14 27l8 8 16-16" />
                  </svg>
                )}
              </div>

              <h2 className="pay-title">
                {paid.method === 'cash' ? 'Order Placed' : 'Payment Successful'}
              </h2>
              <p className="pay-sub">
                {paid.method === 'cash' ? (
                  <>Pay <strong>₹{Number(amountPaid).toFixed(2)}</strong> in cash at the counter when you collect your order.</>
                ) : (
                  <>Paid <strong>₹{Number(amountPaid).toFixed(2)}</strong> via {paid.method === 'upi' ? 'UPI' : 'Card'}</>
                )}
              </p>

              {paid.method !== 'cash' && (
                <div className="poppers" aria-hidden="true">
                  <span className="popper" /><span className="popper" /><span className="popper" />
                  <span className="popper" /><span className="popper" /><span className="popper" />
                  <span className="popper" /><span className="popper" /><span className="popper" />
                  <span className="popper" /><span className="popper" /><span className="popper" />
                </div>
              )}

              <div className="pay-confirm">
                <div className="pay-confirm-row">
                  <span>Token</span>
                  <strong className="pay-confirm-token">🎟️ #{tokenNumber ?? '—'}</strong>
                </div>
                <div className="pay-confirm-row">
                  <span>Estimated wait</span>
                  <strong className="pay-confirm-wait">⏱️ {waitMin ?? '—'} min</strong>
                </div>
                <div className="pay-confirm-row">
                  <span>Queue position</span>
                  <strong>#{position ?? '—'}</strong>
                </div>
                <div className="pay-confirm-row">
                  <span>Pickup slot</span>
                  <strong className="pay-confirm-slot">🕒 {confirmedSlot}</strong>
                </div>
                <div className="pay-confirm-row pay-confirm-total">
                  <span>{paid.method === 'cash' ? 'Amount to pay' : 'Amount paid'}</span>
                  <strong>₹{Number(amountPaid).toFixed(2)}</strong>
                </div>
              </div>

              <button className="pay-cta" onClick={continueToQueue}>
                Track My Order <span>→</span>
              </button>
              <button className="pay-continue" onClick={() => setShowModal(false)}>
                Continue browsing
              </button>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

export default CartPage;
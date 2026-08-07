import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';

const TAX_RATE = 0.05;

function CartPage() {
  const { user } = useAuth();
  const { refresh: refreshCart } = useCart();
  const navigate = useNavigate();
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState('');
  const [paid, setPaid] = useState(null);
  const [slotPreset, setSlotPreset] = useState('asap');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [slotConfirmed, setSlotConfirmed] = useState(false);
  const [confirmedSlot, setConfirmedSlot] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (!paid || !showModal) return;
    const t = setTimeout(() => {
      setShowModal(false);
      setToast({ method: paid.method, confirmation: paid.confirmation });
    }, 2000);
    return () => clearTimeout(t);
  }, [paid, showModal]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 8000);
    return () => clearTimeout(t);
  }, [toast]);

  const fmtTime = (d) =>
    d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });

  const presetOptions = [
    { value: 'asap', label: 'Quick pickup (ASAP)' },
    { value: '30', label: 'Within 30 min' },
    { value: '60', label: 'Within 1 hour' },
    { value: '90', label: 'Within 1.5 hours' },
    { value: 'custom', label: 'Custom time range…' },
  ];

  const getPickupSlot = () => {
    if (slotPreset === 'custom') {
      if (!customFrom || !customTo) return '';
      if (customFrom >= customTo) return '';
      return `Custom pickup ${customFrom}–${customTo}`;
    }
    if (slotPreset === 'asap') return 'Quick pickup (ASAP)';
    const mins = parseInt(slotPreset, 10);
    const now = new Date();
    const to = new Date(now.getTime() + mins * 60000);
    return `Within ${mins} min (${fmtTime(now)}–${fmtTime(to)})`;
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
    setSlotConfirmed(true);
  };

  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    setError('');
    setPlacing(true);
    try {
      const paymentMethod = e.target.payment.value;
      const { data } = await api.post('/orders', { paymentMethod, pickupSlot: confirmedSlot });
      refreshCart();
      setToast(null);
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
      <h1 className="page-heading">
        Your Cart
        {itemCount > 0 && <span className="page-count">({itemCount})</span>}
      </h1>
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
            <div className="cart-banner">
              <span className="cart-banner-icon">⚡</span>
              <div>
                <strong>Quick pickup</strong>
                <p>Your order will be ready in minutes — get pinged the moment it is ready for pickup.</p>
              </div>
            </div>
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

      {paid && showModal && (
        <div className="pay-overlay">
          <div className="pay-modal" onClick={(e) => e.stopPropagation()}>
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

            {paid.method === 'cash' ? (
              <>
                <h2 className="pay-title">Order Placed</h2>
                <p className="pay-sub">
                  Pay <strong>₹{total.toFixed(2)}</strong> in cash at the counter when you collect your order.
                </p>
              </>
            ) : (
              <>
                <h2 className="pay-title">Payment Successful</h2>
                <p className="pay-sub">
                  Paid <strong>₹{total.toFixed(2)}</strong> via{' '}
                  {paid.method === 'upi' ? 'UPI' : 'Card'}
                </p>
              </>
            )}

            {paid.method !== 'cash' && (
              <div className="poppers" aria-hidden="true">
                <span className="popper" /><span className="popper" /><span className="popper" />
                <span className="popper" /><span className="popper" /><span className="popper" />
                <span className="popper" /><span className="popper" /><span className="popper" />
                <span className="popper" /><span className="popper" /><span className="popper" />
              </div>
            )}

            <p className="pay-auto-note">
              Preparing your order details…
              <span className="pay-auto-bar"><span /></span>
            </p>
          </div>
        </div>
      )}

      {toast && (
        <div className="order-toast" role="status">
          <div className="order-toast-head">
            <span className="order-toast-title">
              {toast.method === 'cash' ? 'Order placed' : 'Payment successful'} ✓
            </span>
            <button className="order-toast-close" onClick={() => setToast(null)} aria-label="Dismiss">
              ×
            </button>
          </div>
          <div className="order-toast-body">
            <div className="order-toast-row">
              <span>Token</span>
              <strong>#{toast.confirmation.token.tokenNumber}</strong>
            </div>
            <div className="order-toast-row">
              <span>Items</span>
              <span className="order-toast-items">
                {items.map((i) => (
                  <span key={i.foodItem._id}>{i.foodItem.name} × {i.qty}</span>
                ))}
              </span>
            </div>
            <div className="order-toast-row">
              <span>Pickup slot</span>
              <strong className="order-toast-slot">🕒 {confirmedSlot}</strong>
            </div>
            <div className="order-toast-row order-toast-total">
              <span>{toast.method === 'cash' ? 'Amount to pay' : 'Amount paid'}</span>
              <strong>₹{total.toFixed(2)}</strong>
            </div>
          </div>
          <button className="order-toast-cta" onClick={continueToQueue}>
            Track My Order <span>→</span>
          </button>
        </div>
      )}
    </div>
  );
}

export default CartPage;
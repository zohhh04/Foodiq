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

  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    setError('');
    setPlacing(true);
    try {
      const paymentMethod = e.target.payment.value;
      const { data } = await api.post('/orders', { paymentMethod });
      refreshCart();
      setPaid({ confirmation: data.data, method: paymentMethod });
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
          <ul className="cart-list">
            {items.map((i) => (
              <li key={i.foodItem._id} className="cart-item">
                <div className="cart-item-info">
                  <strong>{i.foodItem.name}</strong>
                  <span>₹{(i.foodItem.price * i.qty).toFixed(2)}</span>
                </div>
                <div className="cart-item-actions">
                  <button onClick={() => changeQty(i.foodItem._id, i.qty - 1)}>-</button>
                  <span>{i.qty}</span>
                  <button onClick={() => changeQty(i.foodItem._id, i.qty + 1)}>+</button>
                  <button className="remove" onClick={() => removeItem(i.foodItem._id)}>
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>

          <div className="cart-summary">
            <h2>Order Summary</h2>
            <div className="summary-row"><span>Subtotal</span><span>₹{subtotal.toFixed(2)}</span></div>
            <div className="summary-row"><span>Tax (5%)</span><span>₹{tax.toFixed(2)}</span></div>
            <div className="summary-row summary-total"><span>Total</span><span>₹{total.toFixed(2)}</span></div>

            <form onSubmit={handlePlaceOrder} className="checkout-form">
              <label>
                Payment method
                <select name="payment" defaultValue="upi">
                  <option value="upi">UPI</option>
                  <option value="card">Card</option>
                  <option value="cash">Cash</option>
                </select>
              </label>
              <button type="submit" disabled={placing}>
                {placing ? 'Placing order…' : 'Place Order'}
              </button>
            </form>
          </div>
        </div>
      )}

      {paid && (
        <div className="pay-overlay" onClick={continueToQueue}>
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

            <p className="pay-token">
              Your token is <strong>#{paid.confirmation.token.tokenNumber}</strong>
            </p>

            <button className="pay-cta" onClick={continueToQueue}>
              Track My Order <span>→</span>
            </button>

            {paid.method !== 'cash' && (
              <div className="poppers" aria-hidden="true">
                <span className="popper" /><span className="popper" /><span className="popper" />
                <span className="popper" /><span className="popper" /><span className="popper" />
                <span className="popper" /><span className="popper" /><span className="popper" />
                <span className="popper" /><span className="popper" /><span className="popper" />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default CartPage;
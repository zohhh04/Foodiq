import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';

const TAX_RATE = 0.05;

function CartPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState('');

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
      items: c.items.map((i) =>
        String(i.foodItem._id) === String(id) ? { ...i, qty } : i
      ),
    }));
    api.put(`/cart/${id}`, { qty });
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
      navigate('/queue', { state: { confirmation: data.data } });
    } catch (err) {
      setError(err.response?.data?.message || 'Could not place order.');
      setCart(null);
      loadCart();
    } finally {
      setPlacing(false);
    }
  };

  if (loading) return <p>Loading cart…</p>;

  if (!user) {
    return (
      <div>
        <h1>Your Cart</h1>
        <p>
          <Link to="/login">Sign in</Link> to view your cart.
        </p>
      </div>
    );
  }

  const items = cart?.items || [];
  const subtotal = items.reduce((s, i) => s + i.foodItem.price * i.qty, 0);
  const tax = Math.round(subtotal * TAX_RATE * 100) / 100;
  const total = Math.round((subtotal + tax) * 100) / 100;

  return (
    <div>
      <h1>Your Cart</h1>
      {error && <p className="auth-error">{error}</p>}

      {items.length === 0 ? (
        <p>
          Your cart is empty. <Link to="/menu">Browse the menu</Link>.
        </p>
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
                  <option value="wallet">Wallet</option>
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
    </div>
  );
}

export default CartPage;
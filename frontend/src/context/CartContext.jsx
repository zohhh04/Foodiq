import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import api from '../api/client.js';
import { useAuth } from './AuthContext.jsx';

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const { user } = useAuth();
  const [quantities, setQuantities] = useState({});

  const refresh = useCallback(() => {
    if (!user) {
      setQuantities({});
      return;
    }
    api
      .get('/cart')
      .then((res) => {
        const q = {};
        (res.data.data?.items || []).forEach((i) => {
          q[String(i.foodItem._id)] = i.qty;
        });
        setQuantities(q);
      })
      .catch(() => setQuantities({}));
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const qty = (id) => quantities[String(id)] || 0;

  const add = async (id) => {
    const key = String(id);
    const next = qty(id) + 1;
    setQuantities((prev) => ({ ...prev, [key]: next }));
    try {
      await api.post('/cart', { foodItemId: id, qty: 1 });
    } catch {
      setQuantities((prev) => ({ ...prev, [key]: Math.max((prev[key] || 0) - 1, 0) }));
    }
  };

  const change = async (id, delta) => {
    const key = String(id);
    const next = Math.max(qty(id) + delta, 0);
    setQuantities((prev) => ({ ...prev, [key]: next }));
    try {
      await api.put(`/cart/${key}`, { qty: next });
    } catch {
      setQuantities((prev) => ({ ...prev, [key]: Math.max((prev[key] || 0) - delta, 0) }));
    }
  };

  const cartCount = Object.values(quantities).reduce((s, n) => s + n, 0);

  return (
    <CartContext.Provider value={{ quantities, qty, add, change, refresh, cartCount }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}

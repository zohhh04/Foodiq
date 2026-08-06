import { useEffect, useRef, useState } from 'react';
import api from '../api/client.js';
import { getSocket } from '../socket.js';

const STATUS_FLOW = ['placed', 'confirmed', 'preparing', 'ready', 'completed'];
const NEXT_ACTION = {
  placed: 'Confirm',
  confirmed: 'Start preparing',
  preparing: 'Mark ready',
  ready: 'Complete',
};

function AdminOrderList({ status, emptyText, allowActions = true, allowCancel = false }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);
  const ordersRef = useRef([]);

  useEffect(() => {
    const socket = getSocket();
    const url = status ? `/orders?status=${status}` : '/orders';
    api
      .get(url)
      .then((res) => {
        ordersRef.current = res.data.data || [];
        setOrders(ordersRef.current);
        ordersRef.current.forEach((o) => socket.emit('join:order', o._id));
      })
      .catch(() => {})
      .finally(() => setLoading(false));

    const onOrderStatus = ({ orderId, status: newStatus }) => {
      ordersRef.current = ordersRef.current.map((o) =>
        String(o._id) === String(orderId) ? { ...o, status: newStatus } : o
      );
      setOrders(ordersRef.current);
    };
    socket.on('order:status', onOrderStatus);
    return () => socket.off('order:status', onOrderStatus);
  }, [status]);

  const updateStatus = async (orderId, nextStatus) => {
    setBusy(orderId);
    try {
      const { data } = await api.put(`/orders/${orderId}/status`, { status: nextStatus });
      ordersRef.current = ordersRef.current.map((o) =>
        String(o._id) === String(orderId) ? { ...o, status: data.data.status } : o
      );
      setOrders(ordersRef.current);
    } catch (err) {
      alert(err.response?.data?.message || 'Could not update order status.');
    } finally {
      setBusy(null);
    }
  };

  if (loading) return <p>Loading orders…</p>;

  if (orders.length === 0) {
    return <p className="empty-note">{emptyText || 'No orders yet.'}</p>;
  }

  return (
    <ul className="order-list">
      {orders.map((o) => {
        const next = NEXT_ACTION[o.status];
        return (
          <li key={o._id} className="order-card">
            <div className="order-card-top">
              <span className="order-token">Token #{o.tokenNumber || '—'}</span>
              <span className={`status-badge status-${o.status}`}>{o.status}</span>
            </div>
            <p className="order-pay">
              {o.user?.name || 'Unknown'} · {o.user?.email} ·{' '}
              {new Date(o.createdAt).toLocaleString()} · {o.paymentMethod} · ₹{o.total}
            </p>
            <ul className="order-items">
              {o.items.map((it, idx) => (
                <li key={idx}>
                  {it.qty}× {it.name} — ₹{(it.price * it.qty).toFixed(2)}
                </li>
              ))}
            </ul>
            {(allowActions && next) || (allowCancel && o.status !== 'completed') ? (
              <div className="admin-actions">
                {allowActions && next && (
                  <button
                    onClick={() => updateStatus(o._id, STATUS_FLOW[STATUS_FLOW.indexOf(o.status) + 1])}
                    disabled={busy === o._id}
                  >
                    {busy === o._id ? 'Updating…' : next}
                  </button>
                )}
                {allowCancel && o.status !== 'completed' && (
                  <button
                    className="danger"
                    onClick={() => updateStatus(o._id, 'cancelled')}
                    disabled={busy === o._id}
                  >
                    Cancel
                  </button>
                )}
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

export default AdminOrderList;

import { useEffect, useRef, useState } from 'react';
import api from '../api/client.js';
import { getSocket } from '../socket.js';

const STATUS_FLOW = ['placed', 'confirmed', 'preparing', 'ready', 'completed'];
const NEXT_ACTION = {
  placed: 'Confirm',
  confirmed: 'Start preparing',
  preparing: 'Mark ready',
  ready: 'Order Picked Up',
};

function AdminOrderList({ status, emptyText, emptyTitle = 'Nothing here yet', emptyIcon = '🛎️', emptyHint, allowActions = true, allowCancel = false, readyOnly = false }) {
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
        let list = res.data.data || [];
        if (readyOnly) {
          list = list.filter((o) => !['ready', 'completed', 'cancelled'].includes(o.status));
        }
        ordersRef.current = list;
        setOrders(ordersRef.current);
        ordersRef.current.forEach((o) => socket.emit('join:order', o._id));
      })
      .catch(() => {})
      .finally(() => setLoading(false));

    const onOrderStatus = ({ orderId, status: newStatus }) => {
      let list = ordersRef.current.map((o) =>
        String(o._id) === String(orderId) ? { ...o, status: newStatus } : o
      );
      if (readyOnly) {
        list = list.filter((o) => !['ready', 'completed', 'cancelled'].includes(o.status));
      }
      if (status && status !== 'all') {
        list = list.filter((o) => o.status === status);
      }
      ordersRef.current = list;
      setOrders(ordersRef.current);
    };
    socket.on('order:status', onOrderStatus);
    return () => socket.off('order:status', onOrderStatus);
  }, [status, readyOnly]);

  const updateStatus = async (orderId, nextStatus) => {
    setBusy(orderId);
    try {
      const { data } = await api.put(`/orders/${orderId}/status`, { status: nextStatus });
      let list = ordersRef.current.map((o) =>
        String(o._id) === String(orderId) ? { ...o, status: data.data.status } : o
      );
      if (readyOnly) {
        list = list.filter((o) => !['ready', 'completed', 'cancelled'].includes(o.status));
      }
      if (status && status !== 'all') {
        list = list.filter((o) => o.status === status);
      }
      ordersRef.current = list;
      setOrders(ordersRef.current);
    } catch (err) {
      alert(err.response?.data?.message || 'Could not update order status.');
    } finally {
      setBusy(null);
    }
  };

  if (loading) return <p>Loading orders…</p>;

  if (orders.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">
          <span>{emptyIcon}</span>
        </div>
        <h2 className="empty-state-title">{emptyTitle}</h2>
        <p className="empty-state-sub">{emptyText || 'No orders here right now.'}</p>
        {emptyHint && <span className="empty-state-hint">{emptyHint}</span>}
      </div>
    );
  }

  return (
    <ul className="order-list">
      {orders.map((o) => {
        const next = readyOnly ? 'Order Ready' : NEXT_ACTION[o.status];
        return (
          <li key={o._id} className={`order-card order-card-${o.status}`}>
            <div className="order-card-top">
              <div className="order-token-box">
                <span className="order-token-label">Token</span>
                <span className="order-token">#{o.tokenNumber || '—'}</span>
              </div>
              <span className={`status-badge status-${o.status}`}>{o.status}</span>
            </div>

            <div className="order-customer">
              <span className="order-customer-avatar">{(o.user?.name || 'U').charAt(0).toUpperCase()}</span>
              <div className="order-customer-info">
                <strong>{o.user?.name || 'Unknown'}</strong>
                <span>{o.user?.email || 'No email'}</span>
              </div>
              <span className="order-time">
                {new Date(o.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>

            <ul className="order-items">
              {o.items.map((it, idx) => (
                <li key={idx}>
                  <span>{it.qty}× {it.name}</span>
                  <span>₹{(it.price * it.qty).toFixed(2)}</span>
                </li>
              ))}
            </ul>

            <div className="order-card-footer">
              <div className="order-total">
                <span>Total</span>
                <strong>₹{o.total}</strong>
              </div>
              {o.pickupSlot && (
                <span className="order-slot" title="Pickup slot">🕒 {o.pickupSlot}</span>
              )}
            </div>

            {(readyOnly && next) || ((allowActions && next) || (allowCancel && o.status !== 'completed')) ? (
              <div className="admin-actions">
                {readyOnly && next && (
                  <button
                    className="ready"
                    onClick={() => updateStatus(o._id, 'ready')}
                    disabled={busy === o._id}
                  >
                    {busy === o._id ? 'Updating…' : next}
                  </button>
                )}
                {!readyOnly && allowActions && next && (
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

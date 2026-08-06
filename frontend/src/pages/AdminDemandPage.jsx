import { useEffect, useState } from 'react';
import api from '../api/client.js';

function AdminDemandPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/admin/demand')
      .then((res) => setData(res.data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Loading demand analysis…</p>;

  if (!data) return <p className="empty-note">Could not load demand data.</p>;

  const statusLabels = {
    placed: 'Placed',
    confirmed: 'Confirmed',
    preparing: 'Preparing',
    ready: 'Ready',
    completed: 'Completed',
    cancelled: 'Cancelled',
  };

  return (
    <div>
      <h1>Demand Analysis</h1>
      <p className="live-hint">Live summary of orders, revenue and top dishes.</p>

      <div className="demand-stats">
        <div className="demand-stat">
          <strong>{data.totalOrders}</strong>
          <span>Total Orders</span>
        </div>
        <div className="demand-stat">
          <strong>₹{data.totalRevenue.toFixed(2)}</strong>
          <span>Revenue</span>
        </div>
        <div className="demand-stat">
          <strong>₹{data.averageOrderValue.toFixed(2)}</strong>
          <span>Avg Order Value</span>
        </div>
      </div>

      <h2 className="demand-h2">Orders by Status</h2>
      <div className="demand-status">
        {Object.entries(statusLabels).map(([key, label]) => (
          <div className="demand-status-chip" key={key}>
            <span className={`status-badge status-${key}`}>{label}</span>
            <strong>{data.statusCounts[key] || 0}</strong>
          </div>
        ))}
      </div>

      <h2 className="demand-h2">Top Dishes</h2>
      {data.topItems.length === 0 ? (
        <p className="empty-note">No orders yet to analyse.</p>
      ) : (
        <ul className="demand-list">
          {data.topItems.map((item, idx) => (
            <li key={idx}>
              <span className="demand-rank">{idx + 1}</span>
              <span className="demand-name">{item._id}</span>
              <span className="demand-meta">{item.qty} sold · ₹{item.revenue.toFixed(2)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default AdminDemandPage;

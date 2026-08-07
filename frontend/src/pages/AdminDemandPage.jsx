import { useEffect, useState } from 'react';
import api from '../api/client.js';

const STATUS_LABELS = {
  placed: 'Placed',
  confirmed: 'Confirmed',
  preparing: 'Preparing',
  ready: 'Ready',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const STATUS_COLORS = {
  placed: '#10b981',
  confirmed: '#22d3ee',
  preparing: '#f59e0b',
  ready: '#3b82f6',
  completed: '#8b5cf6',
  cancelled: '#f87171',
};

const STATUS_ORDER = ['placed', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled'];

const RADIUS = 70;
const CIRC = 2 * Math.PI * RADIUS;

function DonutChart({ data }) {
  const total = STATUS_ORDER.reduce((s, k) => s + (data[k] || 0), 0);

  if (total === 0) {
    return (
      <div className="chart-empty">
        <svg viewBox="0 0 180 180" width="170" height="170" aria-hidden="true">
          <circle cx="90" cy="90" r={RADIUS} fill="none" stroke="#16203a" strokeWidth="22" />
          <circle cx="90" cy="90" r={RADIUS} fill="none" stroke="#1e2a44" strokeWidth="22" strokeDasharray={`${CIRC * 0.25} ${CIRC}`} strokeDashoffset={CIRC * 0.25} strokeLinecap="round" />
        </svg>
        <p>No orders yet to chart.</p>
      </div>
    );
  }

  let offset = 0;
  const segments = STATUS_ORDER.filter((k) => (data[k] || 0) > 0).map((k) => {
    const frac = (data[k] || 0) / total;
    const seg = {
      key: k,
      frac,
      dash: `${Math.max(frac * CIRC - 3, 0.5)} ${CIRC}`,
      dashOffset: -offset * CIRC,
    };
    offset += frac;
    return seg;
  });

  return (
    <div className="donut-wrap">
      <div className="donut">
        <svg viewBox="0 0 180 180" width="170" height="170">
          <circle cx="90" cy="90" r={RADIUS} fill="none" stroke="#16203a" strokeWidth="22" />
          {segments.map((s) => (
            <circle
              key={s.key}
              cx="90"
              cy="90"
              r={RADIUS}
              fill="none"
              stroke={STATUS_COLORS[s.key]}
              strokeWidth="22"
              strokeDasharray={s.dash}
              strokeDashoffset={s.dashOffset}
              strokeLinecap="butt"
              transform="rotate(-90 90 90)"
              className="donut-seg"
            />
          ))}
        </svg>
        <div className="donut-center">
          <strong>{total}</strong>
          <span>orders</span>
        </div>
      </div>
      <ul className="donut-legend">
        {STATUS_ORDER.map((k) => (
          <li key={k}>
            <span className="donut-dot" style={{ background: STATUS_COLORS[k] }} />
            <span className="donut-label">{STATUS_LABELS[k]}</span>
            <span className="donut-value">{data[k] || 0}</span>
            <span className="donut-pct">{total ? Math.round(((data[k] || 0) / total) * 100) : 0}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function TopDishesChart({ items }) {
  const maxQty = Math.max(...items.map((i) => i.qty), 1);

  return (
    <ul className="topbars">
      {items.map((item, idx) => {
        const pct = Math.max((item.qty / maxQty) * 100, 4);
        return (
          <li key={item._id} className="topbar-row">
            <span className="topbar-rank">{idx + 1}</span>
            <div className="topbar-main">
              <div className="topbar-head">
                <span className="topbar-name">{item._id}</span>
                <span className="topbar-nums">
                  <strong>{item.qty} sold</strong> · ₹{item.revenue.toFixed(2)}
                </span>
              </div>
              <div className="topbar-track">
                <div className="topbar-fill" style={{ width: `${pct}%` }} />
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function PeakHoursChart({ hours }) {
  const maxOrders = Math.max(...hours.map((h) => h.orders), 1);
  const peakHour = hours.reduce((best, h) => (h.orders > (best?.orders || 0) ? h : best), null);

  return (
    <div className="peak-wrap">
      <div className="peakbars">
        {hours.map((h) => {
          const pct = Math.max((h.orders / maxOrders) * 100, h.orders > 0 ? 7 : 2.5);
          const isPeak = peakHour && peakHour.orders > 0 && h.hour === peakHour.hour;
          return (
            <div
              key={h.hour}
              className={`peak-col${isPeak ? ' is-peak' : ''}${h.orders === 0 ? ' is-zero' : ''}`}
              title={`${String(h.hour).padStart(2, '0')}:00 — ${h.orders} orders · ₹${h.revenue.toFixed(2)}`}
            >
              <div className="peak-bar" style={{ height: `${pct}%` }} />
            </div>
          );
        })}
      </div>
      <div className="peak-xaxis">
        {[0, 4, 8, 12, 16, 20, 23].map((h) => (
          <span key={h} style={{ left: `calc(${(h / 24) * 100}% + ${100 / 48}%)` }}>
            {String(h).padStart(2, '0')}:00
          </span>
        ))}
      </div>
      {peakHour && peakHour.orders > 0 && (
        <p className="peak-note">
          Peak sales around{' '}
          <strong>{String(peakHour.hour).padStart(2, '0')}:00</strong> — {peakHour.orders} orders in
          that hour.
        </p>
      )}
    </div>
  );
}

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

  const statusTotal = STATUS_ORDER.reduce((s, k) => s + (data.statusCounts[k] || 0), 0);

  return (
    <div>
      <div className="demand-hero">
        <div className="admin-page-head-icon">📈</div>
        <div className="demand-hero-main">
          <div className="demand-hero-title-row">
            <h1>Demand Analysis</h1>
            <span className="demand-live-badge">
              <span className="live-dot" /> Live
            </span>
          </div>
          <p className="live-hint">Live summary of orders, revenue and top dishes.</p>
        </div>
      </div>

      <div className="demand-stats">
        <div className="demand-stat">
          <span className="demand-stat-icon">🧾</span>
          <div className="demand-stat-info">
            <strong>{data.totalOrders}</strong>
            <span className="demand-stat-label">Total Orders</span>
          </div>
        </div>
        <div className="demand-stat">
          <span className="demand-stat-icon">💵</span>
          <div className="demand-stat-info">
            <strong>₹{data.totalRevenue.toFixed(2)}</strong>
            <span className="demand-stat-label">Revenue</span>
          </div>
        </div>
        <div className="demand-stat">
          <span className="demand-stat-icon">⭐</span>
          <div className="demand-stat-info">
            <strong>₹{data.averageOrderValue.toFixed(2)}</strong>
            <span className="demand-stat-label">Avg Order Value</span>
          </div>
        </div>
        <div className="demand-stat demand-stat-extra">
          <span className="demand-stat-icon">🕘</span>
          <div className="demand-stat-info">
            <strong>{statusTotal}</strong>
            <span className="demand-stat-label">Orders Tracked</span>
          </div>
        </div>
      </div>

      <div className="demand-charts">
        <section className="demand-chart-card">
          <div className="demand-chart-head">
            <h2>Orders by Status</h2>
            <span className="demand-chart-count">{statusTotal} total</span>
          </div>
          <DonutChart data={data.statusCounts} />
        </section>

        <section className="demand-chart-card">
          <div className="demand-chart-head">
            <h2>Top Dishes</h2>
            <span className="demand-chart-count">by units sold</span>
          </div>
          {data.topItems.length === 0 ? (
            <p className="chart-empty">No orders yet to analyse.</p>
          ) : (
            <TopDishesChart items={data.topItems} />
          )}
        </section>

        <section className="demand-chart-card demand-chart-card-full">
          <div className="demand-chart-head">
            <h2>Peak Sales Hours</h2>
            <span className="demand-chart-count">orders per hour of the day</span>
          </div>
          <PeakHoursChart hours={data.hourlyOrders || []} />
        </section>
      </div>
    </div>
  );
}

export default AdminDemandPage;

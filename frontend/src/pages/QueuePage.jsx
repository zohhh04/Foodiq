import { useEffect, useRef, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import api from '../api/client.js';
import { getSocket } from '../socket.js';
import { useAuth } from '../context/AuthContext.jsx';

function QueuePage() {
  const [queue, setQueue] = useState([]);
  const [now, setNow] = useState(Date.now());
  const [lastUpdate, setLastUpdate] = useState(null);
  const { state } = useLocation();
  const { user } = useAuth();
  const prevKeysRef = useRef([]);
  const prevPosRef = useRef({});
  const countdownEndRef = useRef(null);

  const myToken = state?.confirmation?.token;
  const myTokenNumber = myToken?.tokenNumber;

  useEffect(() => {
    const socket = getSocket();
    socket.emit('join:queue');
    api
      .get('/queue/status')
      .then((res) => {
        const data = res.data.data || [];
        setQueue(data);
        setLastUpdate(new Date());
      })
      .catch(() => {});

    const onQueueUpdate = (data) => {
      setQueue(data || []);
      setLastUpdate(new Date());
    };
    const onWaitPrediction = ({ orderId, estimatedWaitMin, position }) => {
      setQueue((prev) =>
        prev.map((e) =>
          String(e.orderId) === String(orderId)
            ? { ...e, estimatedWaitMin, position }
            : e
        )
      );
      setLastUpdate(new Date());
    };

    socket.on('queue:update', onQueueUpdate);
    socket.on('wait:prediction', onWaitPrediction);
    const ticker = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      socket.off('queue:update', onQueueUpdate);
      socket.off('wait:prediction', onWaitPrediction);
      clearInterval(ticker);
    };
  }, [user]);

  const serving = queue.length > 0 ? queue[0] : null;
  const myIndex = queue.findIndex((e) => String(e.tokenNumber) === String(myTokenNumber));
  const myEntry = myIndex >= 0 ? queue[myIndex] : null;
  const myWaitMin = myEntry?.estimatedWaitMin ?? myToken?.estimatedWaitMin ?? 0;
  const aheadOfMe = myIndex > 0 ? myIndex : 0;

  if (!countdownEndRef.current && myWaitMin > 0) {
    countdownEndRef.current = Date.now() + myWaitMin * 60000;
  }
  const remainingSec = countdownEndRef.current
    ? Math.max(0, Math.round((countdownEndRef.current - now) / 1000))
    : myWaitMin * 60;
  const mm = String(Math.floor(remainingSec / 60)).padStart(2, '0');
  const ss = String(remainingSec % 60).padStart(2, '0');

  const maxWait = Math.max(1, ...queue.map((e) => e.estimatedWaitMin || 0));

  useEffect(() => {
    const keys = queue.map((e) => String(e.orderId));
    const prevKeys = prevKeysRef.current;
    prevKeysRef.current = keys;

    if (prevKeys.length > 0) {
      const prevSet = new Set(prevKeys);
      const newOnes = keys.filter((k) => !prevSet.has(k));
      if (newOnes.length > 0) {
        document.querySelectorAll('.queue-entry').forEach((el) => {
          if (newOnes.includes(el.dataset.orderId)) {
            el.classList.add('queue-entry-new');
          }
        });
      }
    }

    const posMap = {};
    queue.forEach((e, i) => {
      const id = String(e.orderId);
      if (prevPosRef.current[id] !== undefined && prevPosRef.current[id] < i) {
        posMap[id] = true;
      }
      prevPosRef.current[id] = i;
    });
    if (Object.keys(posMap).length > 0) {
      document.querySelectorAll('.queue-entry').forEach((el) => {
        if (posMap[el.dataset.orderId]) {
          el.classList.add('queue-entry-moved');
          setTimeout(() => el.classList.remove('queue-entry-moved'), 1400);
        }
      });
    }
  }, [queue]);

  const entryState = (idx) => {
    if (idx === 0) return { label: 'Serving now', cls: 'is-serving' };
    if (idx === 1) return { label: 'Next up', cls: 'is-next' };
    return { label: 'In queue', cls: 'is-queued' };
  };

  const fmtClock = () => {
    const d = new Date(now);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const lastUpdatedLabel = () => {
    if (!lastUpdate) return '';
    const diff = Math.floor((now - lastUpdate.getTime()) / 1000);
    if (diff <= 2) return 'just now';
    return `${diff}s ago`;
  };

  const isMyTurn = myIndex === 0 && queue.length > 0;

  return (
    <div className="queue-page">
      <div className="queue-page-bg" aria-hidden="true" />

      <div className="orders-hero">
        <div className="orders-hero-icon">🎫</div>
        <div className="orders-hero-main">
          <div className="orders-hero-title-row">
            <h1>Live Queue</h1>
            <span className="demand-live-badge">
              <span className="live-dot" /> LIVE
            </span>
          </div>
          <p className="live-hint">Token positions & wait times update in real time</p>
        </div>
        <div className="queue-head-clock">
          <span className="queue-head-clock-time">{fmtClock()}</span>
          <span className="queue-head-clock-label">local time</span>
        </div>
      </div>

      {state?.confirmation && (
        <div className={`q-confirmation${isMyTurn ? ' q-confirmation-ready' : ''}`}>
          <div className="q-confirmation-glow" aria-hidden="true" />
          <div className="q-confirmation-top">
            <div className="q-confirmation-bell">🔔</div>
            <div>
              <span className="q-confirmation-eyebrow">Order placed</span>
              <h2>
                Token <strong>#{myTokenNumber}</strong>
              </h2>
            </div>
            <span className={`q-confirmation-live${isMyTurn ? ' is-ready' : ''}`}>
              {isMyTurn ? 'ITS YOUR TURN!' : 'LIVE'}
            </span>
          </div>
          <div className="q-confirmation-stats">
            <div className="q-stat q-stat-countdown">
              <span className="q-stat-value">
                {isMyTurn ? 'Now' : `${mm}:${ss}`}
              </span>
              <span className="q-stat-label">{isMyTurn ? 'being served' : 'est. countdown'}</span>
            </div>
            <div className="q-stat">
              <span className="q-stat-value">#{myEntry?.position ?? myToken?.position ?? '—'}</span>
              <span className="q-stat-label">your position</span>
            </div>
            <div className="q-stat">
              <span className="q-stat-value">{aheadOfMe}</span>
              <span className="q-stat-label">tokens ahead</span>
            </div>
          </div>
          {!isMyTurn && (
            <div className="q-countdown-bar" aria-hidden="true">
              <span
                className="q-countdown-bar-fill"
                style={{ animationDuration: `${Math.max(2, Math.min(myWaitMin || 3, 30))}s` }}
              />
            </div>
          )}
          <div className="q-progress-steps" aria-hidden="true">
            <span className="q-step is-done"><i>✓</i>Placed</span>
            <span className={`q-step${isMyTurn ? ' is-done' : ' is-active'}`}><i>●</i>Preparing</span>
            <span className="q-step"><i>○</i>Ready</span>
            <span className="q-step"><i>○</i>Picked up</span>
          </div>
          <p className="q-confirmation-note">
            {isMyTurn
              ? 'You are up! Head to the counter — your food is being prepared right now.'
              : `We'll ping you the moment your token is ready for pickup. Estimated wait ~${myWaitMin} min.`}
          </p>
          <Link to="/orders" className="q-confirmation-link">View my orders →</Link>
        </div>
      )}

      <div className="queue-ticker">
        {serving ? (
          <>
            <span className="queue-ticker-label">
              <span className="queue-ticker-pulse" />Now serving
            </span>
            <span className="queue-ticker-token-wrap">
              <span className="queue-ticker-ring" aria-hidden="true" />
              <span className="queue-ticker-token">#{serving.tokenNumber}</span>
            </span>
            {serving.estimatedWaitMin != null && (
              <span className="queue-ticker-wait">~{serving.estimatedWaitMin} min</span>
            )}
          </>
        ) : (
          <span className="queue-ticker-empty">Queue is empty — no orders waiting.</span>
        )}
      </div>

      {queue.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <span>🎫</span>
          </div>
          <h2 className="empty-state-title">The queue is all clear</h2>
          <p className="empty-state-sub">
            No orders are waiting right now. Order something tasty and watch your token come to life
            here in real time.
          </p>
          <Link to="/menu" className="empty-state-cta">
            Order Something Tasty <span>→</span>
          </Link>
          <div className="empty-state-hint">Your order status updates live — no refreshing needed.</div>
        </div>
      ) : (
        <div className="queue-board-wrap">
          <div className="queue-board-title">
            <strong>{queue.length} order{queue.length === 1 ? '' : 's'} in queue</strong>
            <span className="queue-board-updated">
              updated <em>{lastUpdatedLabel()}</em>
            </span>
          </div>
          <ol className="queue-board">
            {queue.map((entry, idx) => {
              const st = entryState(idx);
              const isMine = String(entry.tokenNumber) === String(myTokenNumber);
              const pct = Math.max(6, Math.round((entry.estimatedWaitMin / maxWait) * 100));
              return (
                <li
                  key={entry.orderId}
                  data-order-id={String(entry.orderId)}
                  className={`queue-entry ${st.cls}${idx === 0 ? ' queue-entry-serving' : ''}${isMine ? ' queue-entry-mine' : ''}`}
                  style={{ animationDelay: `${idx * 0.06}s` }}
                >
                  <span className="queue-position">
                    #{idx + 1 < 10 ? '0' : ''}
                    {idx + 1}
                  </span>
                  <div className="queue-entry-main">
                    <span className="queue-token">Token {entry.tokenNumber}</span>
                    <span className="queue-entry-state">
                      {isMine && <span className="queue-mine-tag">YOU</span>}
                      {st.label}
                    </span>
                  </div>
                  <span className="queue-wait">
                    {idx === 0 ? <span className="queue-wait-spinner" /> : null}
                    ~{entry.estimatedWaitMin ?? '—'} min
                  </span>
                  <span className={`queue-entry-bar${idx === 0 ? ' is-serving-bar' : ''}`}>
                    <span style={{ width: `${pct}%` }} />
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </div>
  );
}

export default QueuePage;

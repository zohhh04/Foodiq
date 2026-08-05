import { useEffect, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import api from '../api/client.js';
import { getSocket } from '../socket.js';
import { useAuth } from '../context/AuthContext.jsx';

function QueuePage() {
  const [queue, setQueue] = useState([]);
  const { state } = useLocation();
  const { user } = useAuth();

  useEffect(() => {
    const socket = getSocket();
    socket.emit('join:queue');
    api
      .get('/queue/status')
      .then((res) => setQueue(res.data.data || []))
      .catch(() => {});

    const onQueueUpdate = (data) => setQueue(data || []);
    const onWaitPrediction = ({ orderId, estimatedWaitMin, position }) => {
      setQueue((prev) =>
        prev.map((e) =>
          String(e.orderId) === String(orderId)
            ? { ...e, estimatedWaitMin, position }
            : e
        )
      );
    };

    socket.on('queue:update', onQueueUpdate);
    socket.on('wait:prediction', onWaitPrediction);
    return () => {
      socket.off('queue:update', onQueueUpdate);
      socket.off('wait:prediction', onWaitPrediction);
    };
  }, [user]);

  const serving = queue.length > 0 ? queue[0] : null;

  return (
    <div>
      <h1>Live Queue</h1>

      {state?.confirmation && (
        <div className="confirmation">
          <h2>Order placed!</h2>
          <p>
            Your token is <strong>#{state.confirmation.token.tokenNumber}</strong>.
          </p>
          <p>
            Estimated wait:{' '}
            <strong>{state.confirmation.token.estimatedWaitMin} min</strong>. Watch
            this page for live updates.
          </p>
          <Link to="/orders">View my orders</Link>
        </div>
      )}

      <div className="queue-ticker">
        {serving ? (
          <>
            <span className="queue-ticker-label">Next up</span>
            <span className="queue-ticker-token">#{serving.tokenNumber}</span>
          </>
        ) : (
          <span className="queue-ticker-empty">Queue is empty — no orders waiting.</span>
        )}
      </div>

      {queue.length === 0 ? (
        <p>
          No orders in the queue right now.{' '}
          <Link to="/menu">Order something tasty</Link> and it will appear here live.
        </p>
      ) : (
        <ol className="queue-board">
          {queue.map((entry, idx) => (
            <li
              key={entry.orderId}
              className={`queue-entry${idx === 0 ? ' queue-entry-serving' : ''}`}
            >
              <span className="queue-position">
                #{idx + 1 < 10 ? '0' : ''}
                {idx + 1}
              </span>
              <span className="queue-token">Token {entry.tokenNumber}</span>
              <span className="queue-wait">~{entry.estimatedWaitMin ?? '—'} min</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

export default QueuePage;

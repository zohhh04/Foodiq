import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

function LogoutPage() {
  const { user, logout } = useAuth();

  useEffect(() => {
    if (user) logout();
  }, [user, logout]);

  return (
    <div className="logout-shell">
      <div className="logout-card">
        <div className="logout-icon">
          <svg
            viewBox="0 0 24 24"
            width="42"
            height="42"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          <span className="logout-check">
            <svg
              viewBox="0 0 24 24"
              width="22"
              height="22"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </span>
        </div>

        <h1>Logged out successfully</h1>
        <p className="logout-sub">
          Your session has been closed. Thanks for using Foodiq — we hope your meal was delicious!
        </p>

        <div className="logout-stats">
          <div>
            <strong>0</strong>
            <span>min avg wait</span>
          </div>
          <div>
            <strong>40+</strong>
            <span>fresh dishes</span>
          </div>
          <div>
            <strong>4.8</strong>
            <span>loved by students</span>
          </div>
        </div>

        <div className="logout-actions">
          <Link to="/login" className="logout-btn primary">
            Login Again
          </Link>
          <Link to="/register" className="logout-btn">
            Create an Account
          </Link>
          <Link to="/" className="logout-btn ghost">
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}

export default LogoutPage;

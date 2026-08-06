import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import PasswordInput from '../components/PasswordInput.jsx';

function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const loggedInUser = await login(form.email, form.password);
      navigate(loggedInUser?.role === 'admin' ? '/admin/orders' : '/menu');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-shell auth-compact">
      <div className="auth-card">
        <aside className="auth-panel">
          <span className="auth-panel-brand">
            <svg className="auth-brand-logo" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="fiq-logo-g" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#22d3ee" />
                  <stop offset="1" stopColor="#8b5cf6" />
                </linearGradient>
              </defs>
              <path d="M12 20h24a12 12 0 0 1-24 0z" fill="url(#fiq-logo-g)" />
              <path d="M10 20h28" stroke="#e2e8f0" strokeWidth="2" strokeLinecap="round" opacity="0.85" />
              <path d="M19 16c0-2 1.5-3 1.5-5" stroke="#a5f3fc" strokeWidth="2" strokeLinecap="round" />
              <path d="M25 15c0-2 1.5-3 1.5-5" stroke="#a5f3fc" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <span className="auth-brand-text">
              <strong>Smart Canteen</strong>
              <span>AI order ahead</span>
            </span>
          </span>
          <div className="auth-panel-body">
            <h2>
              Skip the queue.
              <br />
              Grab a bite.
            </h2>
            <p>
              Order ahead, watch your spot live, and get notified the moment your meal is ready.
            </p>
            <ul className="auth-features">
              <li>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2l2.4 4.8 5.4.8-3.9 3.8.9 5.4-4.8-2.5-4.8 2.5.9-5.4L4.2 7.6l5.4-.8z" />
                </svg>
                Live queue position tracking
              </li>
              <li>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 3a9 9 0 0 1 9 9c0 5-4 9-9 9s-9-4-9-9 4-9 9-9z" />
                  <path d="M9 13h6" />
                  <path d="M12 10v6" />
                </svg>
                AI-powered dish recommendations
              </li>
              <li>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.7 21a2 2 0 0 1-3.4 0" />
                </svg>
                Instant order-ready notifications
              </li>
            </ul>
          </div>
          <div className="auth-panel-stats">
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
              <span>rating</span>
            </div>
          </div>
        </aside>
        <div className="auth-form-side">
          <h1>Welcome back</h1>
          <p className="auth-sub">Login to continue to your dashboard.</p>
          {error && <p className="auth-error">{error}</p>}
          <form onSubmit={handleSubmit} className="auth-form">
            <label className="auth-label" htmlFor="login-email">Email</label>
            <input
              type="email"
              name="email"
              id="login-email"
              placeholder="you@example.com"
              value={form.email}
              onChange={handleChange}
              required
            />
            <div className="auth-label-row">
              <label className="auth-label" htmlFor="login-password">Password</label>
            </div>
            <PasswordInput
              name="password"
              id="login-password"
              placeholder="Your password"
              value={form.password}
              onChange={handleChange}
              required
            />
            <p className="auth-forgot">
              Forgot your password? <Link to="/forgot-password">Reset it</Link>
            </p>
            <button type="submit" disabled={submitting}>
              {submitting ? 'Logging in…' : 'Login'}
            </button>
          </form>
          <p className="auth-switch">
            No account? <Link to="/register">Create one</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;

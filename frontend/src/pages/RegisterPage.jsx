import { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import PasswordInput from '../components/PasswordInput.jsx';

function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [role, setRole] = useState(location.state?.role || 'student');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await register({ ...form, role });
      localStorage.setItem('pendingEmail', form.email);
      navigate('/verify-otp');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-shell auth-compact auth-tall">
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
              Join Foodiq.
              <br />
              Never queue again.
            </h2>
            <p>Order ahead, skip the line, and get pinged the moment your food is ready.</p>
            <ul className="auth-features">
              <li>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 7v5l3 2" />
                </svg>
                Order in under a minute
              </li>
              <li>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 12h4l3-8 4 16 3-8h6" />
                </svg>
                Real-time order tracking
              </li>
              <li>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 12a9 9 0 1 0 3-6.7" />
                  <path d="M3 4v5h5" />
                </svg>
                One-tap reorder favorites
              </li>
              <li>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 3l7 3v6c0 4-3 7-7 9-4-2-7-5-7-9V6z" />
                </svg>
                Secure OTP verification
              </li>
            </ul>
          </div>
          <div className="auth-panel-stats">
            <div>
              <strong>2k+</strong>
              <span>daily orders</span>
            </div>
            <div>
              <strong>5★</strong>
              <span>student love</span>
            </div>
            <div>
              <strong>100%</strong>
              <span>fresh &amp; hot</span>
            </div>
          </div>
        </aside>
        <div className="auth-form-side">
          <h1>Create your account</h1>
          <p className="auth-sub">Register to start ordering smarter.</p>
          {error && <p className="auth-error">{error}</p>}
          <form onSubmit={handleSubmit} className="auth-form">
            <div className="auth-role-select">
              <button
                type="button"
                className={`role-option student${role === 'student' ? ' active' : ''}`}
                onClick={() => setRole('student')}
              >
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 10 12 5 2 10l10 5 10-5z" />
                  <path d="M6 12v5c0 1.7 2.7 3 6 3s6-1.3 6-3v-5" />
                </svg>
                Student
              </button>
              <button
                type="button"
                className={`role-option admin${role === 'admin' ? ' active' : ''}`}
                onClick={() => setRole('admin')}
              >
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 3l7 3v6c0 4-3 7-7 9-4-2-7-5-7-9V6z" />
                </svg>
                Admin
              </button>
            </div>
            <label className="auth-label" htmlFor="reg-name">Full name</label>
            <input
              type="text"
              name="name"
              id="reg-name"
              placeholder="Your full name"
              value={form.name}
              onChange={handleChange}
              required
            />
            <label className="auth-label" htmlFor="reg-email">Email</label>
            <input
              type="email"
              name="email"
              id="reg-email"
              placeholder="you@example.com"
              value={form.email}
              onChange={handleChange}
              required
            />
            <div className="auth-label-row">
              <label className="auth-label" htmlFor="reg-password">Password</label>
              <span className="auth-label-hint">min 6 characters</span>
            </div>
            <PasswordInput
              name="password"
              id="reg-password"
              placeholder="Create a password"
              value={form.password}
              onChange={handleChange}
              required
              minLength={6}
            />
            <button type="submit" disabled={submitting}>
              {submitting ? 'Sending OTP…' : 'Register & Get OTP'}
            </button>
          </form>
          <p className="auth-switch">
            Already have an account? <Link to="/login">Login</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default RegisterPage;

import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../api/client.js';
import PasswordInput from '../components/PasswordInput.jsx';

function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get('token');

  const [form, setForm] = useState({ password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setSubmitting(true);
    try {
      const { data } = await api.post('/auth/reset-password', { token, ...form });
      setMessage(data.message || 'Password reset successful.');
      setForm({ password: '', confirmPassword: '' });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reset password.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!token) {
    return (
      <div className="auth-page">
        <h1>Reset Password</h1>
        <p className="auth-error">This reset link is invalid or missing. Please request a new one.</p>
        <p>
          <Link to="/forgot-password">Request a new reset link</Link>
        </p>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <h1>Set a New Password</h1>
      {error && <p className="auth-error">{error}</p>}
      {message && (
        <p className="auth-success">
          {message} <Link to="/login">Go to Login</Link>
        </p>
      )}
      <form onSubmit={handleSubmit} className="auth-form">
        <PasswordInput
          name="password"
          placeholder="New password (min 6 characters)"
          value={form.password}
          onChange={handleChange}
          required
          minLength={6}
          disabled={!!message}
        />
        <PasswordInput
          name="confirmPassword"
          placeholder="Confirm new password"
          value={form.confirmPassword}
          onChange={handleChange}
          required
          disabled={!!message}
        />
        <button type="submit" disabled={submitting || !!message}>
          {submitting ? 'Saving…' : 'Save Password'}
        </button>
      </form>
      <p>
        Remembered your password? <Link to="/login">Login</Link>
      </p>
    </div>
  );
}

export default ResetPasswordPage;

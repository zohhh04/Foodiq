import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client.js';

function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setSubmitting(true);
    try {
      const { data } = await api.post('/auth/forgot-password', { email });
      setMessage(data.message || 'A password reset link has been sent to your email.');
      setEmail('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send reset link.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page auth-lg-page">
      <h1>Forgot Password</h1>
      <p>Enter the email you registered with. We'll send you a link to reset your password.</p>
      {error && <p className="auth-error">{error}</p>}
      {message && <p className="auth-success">{message}</p>}
      <form onSubmit={handleSubmit} className="auth-form">
        <input
          type="email"
          name="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <button type="submit" disabled={submitting || !email}>
          {submitting ? 'Sending…' : 'Send Reset Link'}
        </button>
      </form>
      <p>
        Remembered your password? <Link to="/login">Login</Link>
      </p>
    </div>
  );
}

export default ForgotPasswordPage;

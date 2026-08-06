import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

function VerifyOtpPage() {
  const { verifyOtp, resendOtp } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState(localStorage.getItem('pendingEmail') || '');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setSubmitting(true);
    try {
      await verifyOtp(email, otp);
      localStorage.removeItem('pendingEmail');
      setMessage('Email verified successfully! Redirecting to login…');
      setTimeout(() => navigate('/login'), 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'Verification failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    setError('');
    setMessage('');
    setResending(true);
    try {
      const data = await resendOtp(email);
      setMessage(data.message || 'A new OTP has been sent to your email.');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not resend OTP.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="auth-page">
      <h1>Verify Your Email</h1>
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
        <input
          type="text"
          name="otp"
          placeholder="6-digit OTP"
          value={otp}
          onChange={(e) => setOtp(e.target.value)}
          required
          maxLength={6}
        />
        <p className="auth-resend">
          <a
            href="#resend"
            onClick={(e) => {
              e.preventDefault();
              handleResend();
            }}
          >
            {resending ? 'Sending…' : 'Resend OTP'}
          </a>
        </p>
        <button type="submit" disabled={submitting || !email || !otp}>
          {submitting ? 'Verifying…' : 'Verify OTP'}
        </button>
      </form>
      <p>
        Didn't register? <Link to="/register">Create an account</Link>
      </p>
    </div>
  );
}

export default VerifyOtpPage;

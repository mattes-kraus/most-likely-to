import React, { useState } from 'react';
import { Link } from 'react-router-dom';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Something went wrong');
      }

      setMessage(data.message);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <div className="card animate-in" style={{ width: '100%', maxWidth: '400px' }}>
        <h1 className="gradient-text" style={{ textAlign: 'center', marginBottom: '8px', fontSize: '2rem' }}>
          Reset Password
        </h1>
        <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: '32px' }}>
          Enter your email and we'll send you a reset link
        </p>

        {error && <div className="error-msg">{error}</div>}
        {message && <div style={{ color: 'var(--primary)', backgroundColor: 'rgba(255,107,107,0.1)', padding: '12px', borderRadius: '8px', marginBottom: '16px', textAlign: 'center' }}>{message}</div>}

        {!message && (
          <form onSubmit={handleSubmit}>
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <button type="submit" disabled={loading}>
              {loading ? <div className="spinner"></div> : 'Send Reset Link'}
            </button>
          </form>
        )}

        <p style={{ textAlign: 'center', marginTop: '24px', fontSize: '0.875rem' }}>
          <Link to="/login">Back to Login</Link>
        </p>
      </div>
    </div>
  );
}

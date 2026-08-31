import React, { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';

export default function ResetPassword() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { token } = useParams();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');

    if (newPassword !== confirmPassword) {
      return setError('Passwords do not match');
    }

    setLoading(true);

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Something went wrong');
      }

      setMessage('Password reset successful. You can now log in.');
      setTimeout(() => {
        navigate('/login');
      }, 3000);
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
          Create New Password
        </h1>

        {error && <div className="error-msg">{error}</div>}
        {message && <div style={{ color: 'var(--primary)', backgroundColor: 'rgba(255,107,107,0.1)', padding: '12px', borderRadius: '8px', marginBottom: '16px', textAlign: 'center' }}>{message}</div>}

        {!message && (
          <form onSubmit={handleSubmit}>
            <input
              type="password"
              placeholder="New password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
            <input
              type="password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
            <button type="submit" disabled={loading}>
              {loading ? <div className="spinner"></div> : 'Reset Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

import React, { useContext, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import MemberBadge from './MemberBadge';

export default function Navbar() {
  const { user } = useContext(AuthContext);
  
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'girly');

  useEffect(() => {
    document.body.dataset.theme = theme;
    localStorage.setItem('theme', theme);
    // Update the theme-color meta tag for mobile browsers
    const meta = document.getElementById('theme-color-meta');
    if (meta) {
      meta.setAttribute('content', theme === 'girly' ? '#fff0f5' : '#0a0a0f');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(t => t === 'dark' ? 'girly' : 'dark');
  };

  return (
    <nav className="glass-nav">
      <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <h2 className="gradient-text" style={{ margin: 0, fontSize: '1.5rem' }}>MostLikelyTo</h2>
      </Link>
      
      {user && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={toggleTheme}
            className="btn-secondary"
            style={{ width: '36px', height: '36px', padding: 0, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}
            title={theme === 'dark' ? 'Switch to Girly Mode' : 'Switch to Dark Mode'}
          >
            {theme === 'dark' ? '🩰' : '🌙'}
          </button>
          <Link to="/profile" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none', color: 'inherit' }}>
            <MemberBadge username={user.username} avatarUrl={user.avatar_url} size={36} />
          </Link>
        </div>
      )}
    </nav>
  );
}

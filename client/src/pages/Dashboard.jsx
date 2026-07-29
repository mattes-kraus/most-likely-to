import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import GroupCard from '../components/GroupCard';
import { api } from '../api';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const { user } = useContext(AuthContext);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createName, setCreateName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [createdCode, setCreatedCode] = useState('');
  
  const navigate = useNavigate();

  const fetchGroups = async () => {
    try {
      const data = await api('/api/groups');
      setGroups(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!createName.trim()) return;
    setError('');
    setActionLoading(true);
    try {
      const data = await api('/api/groups', {
        method: 'POST',
        body: JSON.stringify({ name: createName })
      });
      setCreatedCode(data.code);
      setCreateName('');
      fetchGroups();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleJoinGroup = async (e) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    setError('');
    setActionLoading(true);
    try {
      const data = await api('/api/groups/join', {
        method: 'POST',
        body: JSON.stringify({ code: joinCode })
      });
      setJoinCode('');
      navigate(`/group/${data.groupId || data.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <>
      <Navbar />
      <div className="layout">
        {/* iOS Safari auto-focuses the first input on page load, opening the keyboard.
            This invisible dummy absorbs that focus without triggering the keyboard. */}
        <input
          aria-hidden="true"
          readOnly
          tabIndex={-1}
          style={{ opacity: 0, height: 0, width: 0, position: 'absolute', pointerEvents: 'none' }}
        />
        <header className="animate-in" style={{ marginBottom: '40px', marginTop: '20px' }}>
          <h1 style={{ fontSize: '2.5rem', marginBottom: '8px' }}>
            Welcome, <span className="gradient-text">{user?.username}</span>! 👋
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>
            Ready to ask some better questions today?
          </p>
        </header>

        {error && <div className="error-msg">{error}</div>}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginBottom: '48px' }}>
          <div className="card animate-in" style={{ animationDelay: '0.1s' }}>
            <h2 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>✨</span> Create Group
            </h2>
            <form onSubmit={handleCreateGroup}>
              <input 
                type="text" 
                placeholder="Group Name" 
                value={createName}
                onChange={e => setCreateName(e.target.value)}
              />
              <button type="submit" disabled={actionLoading || !createName.trim()}>
                Create
              </button>
            </form>
            
            {createdCode && (
              <div style={{ marginTop: '16px', padding: '12px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                <p style={{ color: 'var(--success)', margin: '0 0 8px 0', fontSize: '0.875rem' }}>Group created successfully! Share this code:</p>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', textAlign: 'center', letterSpacing: '4px' }}>
                  {createdCode}
                </div>
              </div>
            )}
          </div>

          <div className="card animate-in" style={{ animationDelay: '0.2s' }}>
            <h2 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>🤝</span> Join Group
            </h2>
            <form onSubmit={handleJoinGroup}>
              <input 
                type="text" 
                placeholder="6-Digit Code" 
                value={joinCode}
                onChange={e => setJoinCode(e.target.value.toUpperCase())}
                maxLength={6}
                style={{ textTransform: 'uppercase', letterSpacing: joinCode.length > 0 ? '2px' : 'normal' }}
              />
              <button type="submit" disabled={actionLoading || joinCode.length < 5}>
                Join
              </button>
            </form>
          </div>
        </div>

        <div>
          <h2 style={{ marginBottom: '24px', fontSize: '1.5rem', borderBottom: '1px solid var(--card-border)', paddingBottom: '12px' }}>
            Your Groups
          </h2>
          
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center' }}><div className="spinner"></div></div>
          ) : groups.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--text-secondary)' }}>
              <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📭</div>
              <h3 style={{ marginBottom: '8px', color: 'var(--text-primary)' }}>No groups yet</h3>
              <p>Create or join a group to get started!</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
              {groups.map((group, idx) => (
                <GroupCard key={group.id} group={group} index={idx} />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <footer style={{
          marginTop: '48px',
          paddingTop: '24px',
          borderTop: '1px solid var(--card-border)',
          textAlign: 'center',
          color: 'var(--text-tertiary)',
          fontSize: '0.85rem',
          paddingBottom: '24px'
        }}>
          <p style={{ marginBottom: '8px' }}>Made with 💜 by Luise and Mattes</p>
          <a 
            href="https://github.com/mattes-kraus/most-likely-to" 
            target="_blank" 
            rel="noopener noreferrer"
            style={{ 
              color: 'var(--text-secondary)', 
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'color 0.2s'
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg> GitHub
          </a>
        </footer>
      </div>
    </>
  );
}

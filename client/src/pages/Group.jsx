import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import MemberBadge from '../components/MemberBadge';
import VoteResults from '../components/VoteResults';
import CustomQuestions from '../components/CustomQuestions';
import { api } from '../api';
import { AuthContext } from '../context/AuthContext';

export default function Group() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  
  const [group, setGroup] = useState(null);
  const [todayData, setTodayData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [openAnswer, setOpenAnswer] = useState('');
  const [copied, setCopied] = useState(false);
  const [showCustom, setShowCustom] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const groupData = await api(`/api/groups/${id}`);
      setGroup(groupData);
      
      const today = await api(`/api/groups/${id}/today`);
      setTodayData(today);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const handleVote = async (votedForId) => {
    setActionLoading(true);
    try {
      await api(`/api/groups/${id}/vote`, {
        method: 'POST',
        body: JSON.stringify({ votedForId })
      });
      await fetchData();
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleAnswerSubmit = async (e) => {
    e.preventDefault();
    if (!openAnswer.trim()) return;
    setActionLoading(true);
    try {
      await api(`/api/groups/${id}/answer`, {
        method: 'POST',
        body: JSON.stringify({ answerText: openAnswer })
      });
      setOpenAnswer('');
      await fetchData();
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSkipDay = async () => {
    setActionLoading(true);
    try {
      await api(`/api/groups/${id}/skip-day`, { method: 'POST' });
      await fetchData();
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const copyCode = () => {
    if (group?.code) {
      navigator.clipboard.writeText(group.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const dq = todayData?.dailyQuestion;
  const questionType = dq?.type;
  const dayNumber = dq?.day_number || 1;
  const todayStr = new Date().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const dayLabel = dayNumber === 1 ? todayStr : `${todayStr}, ${dayNumber}. Frage`;
  const isAdmin = user && group && group.created_by === user.id;

  if (loading) {
    return <><Navbar /><div className="layout" style={{ display: 'flex', justifyContent: 'center', marginTop: '100px' }}><div className="spinner"></div></div></>;
  }

  if (error) {
    return (
      <>
        <Navbar />
        <div className="layout">
          <div className="error-msg">{error}</div>
          <button onClick={() => navigate('/')} className="btn-secondary" style={{ width: 'auto' }}>Back to Dashboard</button>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="layout">
        <button 
          onClick={() => navigate('/')} 
          className="btn-secondary" 
          style={{ width: 'auto', padding: '8px 16px', marginBottom: '24px', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
        >
          ← Back
        </button>

        <header className="card animate-in" style={{ marginBottom: '32px', display: 'flex', flexWrap: 'wrap', gap: '24px', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '2rem', marginBottom: '8px' }}>{group?.name}</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>{dayLabel}</span>
              <span style={{ color: 'var(--card-border)' }}>|</span>
              <div 
                className="theme-box"
                onClick={copyCode}
                style={{ 
                  padding: '4px 12px', 
                  borderRadius: '6px',
                  fontFamily: 'monospace',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'background 0.2s'
                }}
                title="Click to copy"
              >
                {group?.code} {copied ? '✓' : '📋'}
              </div>
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '4px' }}>
            {group?.members?.slice(0, 5).map((m, i) => (
              <MemberBadge key={m.id || i} username={m.username} avatarUrl={m.avatar_url} size={36} />
            ))}
            {group?.members?.length > 5 && (
              <div style={{ 
                width: 36, height: 36, borderRadius: '50%', 
                background: 'rgba(255,255,255,0.1)', 
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.8rem', fontWeight: 'bold'
              }}>
                +{group.members.length - 5}
              </div>
            )}
          </div>
        </header>

        {dq && (
          <div className="card animate-in" style={{ animationDelay: '0.1s' }}>
            <h2 className="gradient-text" style={{ fontSize: '2rem', textAlign: 'center', margin: '24px 0 40px', lineHeight: 1.3 }}>
              {dq.text}
            </h2>

            {todayData.hasVoted ? (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '24px' }}>
                  <h3 style={{ color: 'var(--success)', margin: 0 }}>Results are in! 🎉</h3>
                  <button
                    onClick={fetchData}
                    className="btn-secondary"
                    style={{ width: '36px', height: '36px', padding: 0, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}
                    title="Refresh answers"
                  >
                    🔄
                  </button>
                </div>
                <VoteResults 
                  results={todayData.results} 
                  type={questionType} 
                  members={group?.members}
                />
              </div>
            ) : (
              <div style={{ maxWidth: '600px', margin: '0 auto' }}>
                {questionType === 'vote' ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
                    {(todayData.members || group?.members || []).map(member => (
                      <button 
                        key={member.id}
                        onClick={() => handleVote(member.id)}
                        disabled={actionLoading}
                        className="btn-secondary"
                        style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', justifyContent: 'flex-start' }}
                      >
                        <MemberBadge username={member.username} avatarUrl={member.avatar_url} size={32} />
                        <span style={{ fontSize: '1.1rem' }}>{member.username}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <form onSubmit={handleAnswerSubmit}>
                    <textarea 
                      value={openAnswer}
                      onChange={e => setOpenAnswer(e.target.value)}
                      placeholder="Type your answer here..."
                      style={{
                        width: '100%',
                        border: '1px solid var(--card-border)',
                        borderRadius: '10px',
                        color: 'var(--text-primary)',
                        padding: '16px',
                        fontFamily: 'inherit',
                        fontSize: '1rem',
                        minHeight: '120px',
                        resize: 'vertical',
                        marginBottom: '16px',
                        outline: 'none'
                      }}
                      required
                    />
                    <button type="submit" disabled={actionLoading || !openAnswer.trim()}>
                      Submit Answer
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>
        )}

        <div style={{ marginTop: '48px', display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <button 
            onClick={() => setShowCustom(!showCustom)}
            className="btn-secondary"
            style={{ width: 'auto', padding: '8px 24px', fontSize: '0.875rem' }}
          >
            📝 {showCustom ? 'Hide' : 'Submit'} Questions
          </button>
          {isAdmin && (
            <button 
              onClick={handleSkipDay}
              disabled={actionLoading}
              className="btn-secondary"
              style={{ width: 'auto', padding: '8px 24px', fontSize: '0.875rem', opacity: 0.7 }}
              title="Admin only: Skip to the next question"
            >
              ⏭️ Skip to next day
            </button>
          )}
        </div>

        {showCustom && (
          <CustomQuestions groupId={id} onClose={() => setShowCustom(false)} />
        )}
      </div>
    </>
  );
}

import React, { useEffect, useState } from 'react';
import MemberBadge from './MemberBadge';

export default function VoteResults({ results, type, members, featuredMember, canMarkCorrect, onMarkCorrect, leaderboard }) {
  const [animate, setAnimate] = useState(false);
  
  useEffect(() => {
    const timer = setTimeout(() => setAnimate(true), 50);
    return () => clearTimeout(timer);
  }, []);

  if (!results || results.length === 0) {
    return <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '24px' }}>No answers yet.</div>;
  }

  if (type === 'vote') {
    const totalVotes = results.reduce((sum, r) => sum + (r.count || 0), 0);
    const maxVotes = Math.max(...results.map(r => r.count || 0));
    
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '24px' }}>
        {results.map((result, index) => {
          const percentage = totalVotes > 0 ? Math.round((result.count / totalVotes) * 100) : 0;
          const barWidth = maxVotes > 0 ? (result.count / maxVotes) * 100 : 0;
          const isWinner = result.count === maxVotes && maxVotes > 0;
          const username = result.username || (members?.find(m => m.id === result.voted_for_id)?.username) || 'Unknown';
          
          return (
            <div key={result.voted_for_id || index} className="animate-in" style={{ animationDelay: `${index * 0.1}s` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <MemberBadge username={username} avatarUrl={result.avatar_url || members?.find(m => m.id === result.voted_for_id)?.avatar_url} size={24} />
                  <span>{username} {isWinner && <span title="Winner">👑</span>}</span>
                </div>
                <span style={{ fontWeight: 'bold', color: 'var(--text-secondary)' }}>
                  {result.count} {result.count === 1 ? 'vote' : 'votes'} ({percentage}%)
                </span>
              </div>
              
              <div className="theme-box" style={{ 
                height: '12px', 
                borderRadius: '6px',
                overflow: 'hidden'
              }}>
                <div style={{ 
                  height: '100%', 
                  background: isWinner ? 'linear-gradient(90deg, #f59e0b, #fbbf24)' : 'linear-gradient(90deg, var(--primary-start), var(--primary-end))',
                  width: animate ? `${barWidth}%` : '0%',
                  transition: `width 1s cubic-bezier(0.34, 1.56, 0.64, 1) ${index * 0.15}s`,
                  borderRadius: '6px'
                }} />
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  if (type === 'guess') {
    const truth = results.find(r => r.user_id === featuredMember?.id);
    const guesses = results.filter(r => r.user_id !== featuredMember?.id);
    const correctCount = guesses.filter(r => r.is_correct).length;

    return (
      <div style={{ display: 'grid', gap: '16px', marginTop: '24px' }}>
        <div className="card animate-in" style={{ padding: '16px', border: '1px solid #f59e0b' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <MemberBadge username={featuredMember?.username} avatarUrl={featuredMember?.avatar_url} size={24} />
            <span style={{ fontWeight: 600 }}>✨ {featuredMember?.username}'s answer</span>
          </div>
          <div className="theme-box" style={{ color: truth ? 'var(--text-primary)' : 'var(--text-secondary)', lineHeight: 1.5, padding: '12px', borderRadius: '8px', fontStyle: truth ? 'normal' : 'italic' }}>
            {truth ? truth.answer_text : `Waiting for ${featuredMember?.username || 'them'} to answer...`}
          </div>
        </div>

        {guesses.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '8px' }}>No guesses yet.</div>
        ) : (
          <>
            {canMarkCorrect && (
              <div style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                Tap the guesses that are right – each one is worth a point.
              </div>
            )}
            {guesses.map((result, index) => (
              <div key={result.user_id || index} className="card animate-in" style={{
                animationDelay: `${index * 0.1}s`,
                padding: '16px',
                border: result.is_correct ? '1px solid #22c55e' : undefined
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <MemberBadge username={result.username} avatarUrl={result.avatar_url} size={24} />
                    <span style={{ fontWeight: 600 }}>{result.username}</span>
                  </div>
                  {canMarkCorrect ? (
                    <button
                      onClick={() => onMarkCorrect(result.id, !result.is_correct)}
                      className={result.is_correct ? '' : 'btn-secondary'}
                      style={{ width: 'auto', padding: '4px 12px', fontSize: '0.8rem' }}
                    >
                      {result.is_correct ? '✓ Correct' : 'Mark correct'}
                    </button>
                  ) : result.is_correct ? (
                    <span style={{ color: '#22c55e', fontWeight: 600, fontSize: '0.9rem' }}>✓ Correct</span>
                  ) : null}
                </div>
                <div className="theme-box" style={{ color: 'var(--text-primary)', lineHeight: 1.5, padding: '12px', borderRadius: '8px' }}>
                  {result.answer_text}
                </div>
              </div>
            ))}
            {truth && !canMarkCorrect && (
              <div style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                {correctCount} of {guesses.length} {guesses.length === 1 ? 'guess' : 'guesses'} marked correct by {featuredMember?.username}
              </div>
            )}
          </>
        )}

        {leaderboard && leaderboard.length > 0 && (
          <div className="card animate-in" style={{ padding: '16px' }}>
            <div style={{ fontWeight: 600, marginBottom: '12px' }}>🏆 Who knows the family best?</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {leaderboard.map((m, index) => (
                <div key={m.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: '20px', color: 'var(--text-secondary)' }}>{index + 1}.</span>
                    <MemberBadge username={m.username} avatarUrl={m.avatar_url} size={24} />
                    <span>{m.username} {index === 0 && m.points > 0 && '👑'}</span>
                  </div>
                  <span style={{ fontWeight: 'bold', color: 'var(--text-secondary)' }}>
                    {m.points} {m.points === 1 ? 'point' : 'points'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Open question results
  return (
    <div style={{ display: 'grid', gap: '16px', marginTop: '24px' }}>
      {results.map((result, index) => (
        <div key={result.user_id || index} className="card animate-in" style={{ animationDelay: `${index * 0.1}s`, padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <MemberBadge username={result.username} avatarUrl={result.avatar_url} size={24} />
            <span style={{ fontWeight: 600 }}>{result.username}</span>
          </div>
          <div className="theme-box" style={{ color: 'var(--text-primary)', lineHeight: 1.5, padding: '12px', borderRadius: '8px' }}>
            {result.answer_text}
          </div>
        </div>
      ))}
    </div>
  );
}

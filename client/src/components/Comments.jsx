import React, { useState, useEffect, useRef } from 'react';
import { api } from '../api';
import MemberBadge from './MemberBadge';

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const isoStr = dateStr.includes('T') ? dateStr : dateStr.replace(' ', 'T');
  const utcStr = isoStr.endsWith('Z') ? isoStr : isoStr + 'Z';
  return new Date(utcStr).toLocaleString(undefined, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export default function Comments({ groupId, dailyQuestionId }) {
  const [comments, setComments] = useState([]);
  const [newText, setNewText] = useState('');
  const [loading, setLoading] = useState(false);
  const textareaRef = useRef(null);

  const fetchComments = async () => {
    try {
      const data = await api(`/api/groups/${groupId}/comments/${dailyQuestionId}`);
      setComments(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (dailyQuestionId) {
      fetchComments();
      const interval = setInterval(() => {
        fetchComments();
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [dailyQuestionId, groupId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newText.trim()) return;

    setLoading(true);
    try {
      const newComment = await api(`/api/groups/${groupId}/comments/${dailyQuestionId}`, {
        method: 'POST',
        body: JSON.stringify({ text: newText })
      });
      setComments([...comments, newComment]);
      setNewText('');
      if (textareaRef.current) {
        textareaRef.current.style.height = '48px';
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInput = (e) => {
    setNewText(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.max(48, textareaRef.current.scrollHeight)}px`;
    }
  };

  return (
    <div style={{ marginTop: '32px', paddingTop: '24px', borderTop: '1px solid var(--card-border)' }}>
      <h3 style={{ marginBottom: '16px', fontSize: '1.25rem' }}>Comments</h3>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
        {comments.map(c => (
          <div key={c.id} style={{ display: 'flex', gap: '12px' }}>
            <MemberBadge username={c.username} avatarUrl={c.avatar_url} size={32} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                <strong>{c.username}</strong> • {formatDate(c.created_at)}
              </div>
              <div style={{ background: 'var(--bg-primary)', padding: '12px', borderRadius: '8px', fontSize: '0.95rem', whiteSpace: 'pre-wrap' }}>
                {c.text}
              </div>
            </div>
          </div>
        ))}
        {comments.length === 0 && (
          <div style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>No comments yet. Be the first!</div>
        )}
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
        <textarea 
          ref={textareaRef}
          value={newText}
          onChange={handleInput}
          placeholder="Write a comment..."
          rows={1}
          style={{
            flex: 1,
            background: 'var(--bg-primary)',
            border: '1px solid var(--card-border)',
            borderRadius: '8px',
            padding: '12px',
            color: 'var(--text-primary)',
            outline: 'none',
            resize: 'none',
            minHeight: '48px',
            height: '48px',
            margin: 0,
            overflow: 'hidden',
            fontFamily: 'inherit',
            boxSizing: 'border-box',
            lineHeight: '1.5'
          }}
          required
        />
        <button 
          type="submit" 
          disabled={loading || !newText.trim()}
          style={{ padding: '0 16px', height: '48px', width: 'auto', fontSize: '0.9rem', flexShrink: 0, boxSizing: 'border-box', margin: 0 }}
        >
          Post
        </button>
      </form>
    </div>
  );
}

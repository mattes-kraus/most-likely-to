import React, { useState, useEffect, useContext } from 'react';
import { api } from '../api';
import { AuthContext } from '../context/AuthContext';

export default function CustomQuestions({ groupId, onClose }) {
  const { user } = useContext(AuthContext);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [type, setType] = useState('vote');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');
  const [editType, setEditType] = useState('vote');

  const fetchQuestions = async () => {
    try {
      const data = await api(`/api/groups/${groupId}/custom-questions`);
      setQuestions(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestions();
  }, [groupId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    setSubmitting(true);
    setError('');
    try {
      await api(`/api/groups/${groupId}/custom-questions`, {
        method: 'POST',
        body: JSON.stringify({ text: text.trim(), type })
      });
      setText('');
      setType('vote');
      fetchQuestions();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (qid) => {
    if (!editText.trim()) return;
    setSubmitting(true);
    setError('');
    try {
      await api(`/api/groups/${groupId}/custom-questions/${qid}`, {
        method: 'PUT',
        body: JSON.stringify({ text: editText.trim(), type: editType })
      });
      setEditingId(null);
      fetchQuestions();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (qid) => {
    if (!confirm('Delete this question?')) return;
    try {
      await api(`/api/groups/${groupId}/custom-questions/${qid}`, {
        method: 'DELETE'
      });
      fetchQuestions();
    } catch (err) {
      setError(err.message);
    }
  };

  const startEdit = (q) => {
    setEditingId(q.id);
    setEditText(q.text);
    setEditType(q.type);
  };

  return (
    <div className="card animate-in" style={{ marginTop: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
          <span>📝</span> Custom Questions
        </h2>
        <button
          onClick={onClose}
          className="btn-secondary"
          style={{ width: 'auto', padding: '6px 14px', fontSize: '0.85rem' }}
        >
          ✕ Close
        </button>
      </div>

      {error && <div className="error-msg">{error}</div>}

      {/* Submit form */}
      <form onSubmit={handleSubmit} style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
          <button
            type="button"
            onClick={() => setType('vote')}
            className={type === 'vote' ? '' : 'btn-secondary'}
            style={{ width: 'auto', padding: '8px 16px', fontSize: '0.85rem' }}
          >
            🗳️ Vote
          </button>
          <button
            type="button"
            onClick={() => setType('open')}
            className={type === 'open' ? '' : 'btn-secondary'}
            style={{ width: 'auto', padding: '8px 16px', fontSize: '0.85rem' }}
          >
            ✍️ Open
          </button>
        </div>
        
        <input
          type="text"
          placeholder={type === 'vote' 
            ? 'e.g. Who is most likely to sleep through an alarm?' 
            : 'e.g. [MEMBER] just got kicked out of IKEA. What happened?'}
          value={text}
          onChange={e => setText(e.target.value)}
          style={{ marginBottom: '12px' }}
        />
        
        {type === 'open' && (
          <p style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', marginTop: '-8px', marginBottom: '12px' }}>
            💡 Use [MEMBER] to insert a random group member's name
          </p>
        )}
        
        <button type="submit" disabled={submitting || !text.trim()}>
          {submitting ? <div className="spinner"></div> : 'Add Question'}
        </button>
      </form>

      {/* Question list */}
      <div>
        <h3 style={{ marginBottom: '16px', color: 'var(--text-secondary)', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
          Submitted Questions ({questions.length})
        </h3>

        {loading ? (
          <div style={{ padding: '24px', textAlign: 'center' }}><div className="spinner"></div></div>
        ) : questions.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-tertiary)' }}>
            No custom questions yet. Add one above!
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {questions.map(q => (
              <div key={q.id} className="theme-box" style={{
                padding: '14px 16px',
                borderRadius: '10px',
                border: '1px solid var(--card-border)',
              }}>
                {editingId === q.id ? (
                  /* Edit mode */
                  <div>
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                      <button
                        type="button"
                        onClick={() => setEditType('vote')}
                        className={editType === 'vote' ? '' : 'btn-secondary'}
                        style={{ width: 'auto', padding: '4px 12px', fontSize: '0.8rem' }}
                      >
                        🗳️ Vote
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditType('open')}
                        className={editType === 'open' ? '' : 'btn-secondary'}
                        style={{ width: 'auto', padding: '4px 12px', fontSize: '0.8rem' }}
                      >
                        ✍️ Open
                      </button>
                    </div>
                    <input
                      type="text"
                      value={editText}
                      onChange={e => setEditText(e.target.value)}
                      style={{ marginBottom: '8px' }}
                    />
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => handleEdit(q.id)}
                        disabled={submitting || !editText.trim()}
                        style={{ width: 'auto', padding: '6px 16px', fontSize: '0.85rem' }}
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="btn-secondary"
                        style={{ width: 'auto', padding: '6px 16px', fontSize: '0.85rem' }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  /* View mode */
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span style={{
                          fontSize: '0.7rem',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontWeight: 600,
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          background: q.type === 'vote' ? 'rgba(99, 102, 241, 0.2)' : 'rgba(6, 182, 212, 0.2)',
                          color: q.type === 'vote' ? 'var(--primary-start)' : 'var(--secondary)',
                        }}>
                          {q.type === 'vote' ? '🗳️ Vote' : '✍️ Open'}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                          by {q.created_by_name}
                        </span>
                      </div>
                      <p style={{ margin: 0, lineHeight: 1.4 }}>{q.text}</p>
                    </div>
                    
                    {q.isOwn && (
                      <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                        <button
                          onClick={() => startEdit(q)}
                          className="btn-secondary"
                          style={{ width: 'auto', padding: '4px 10px', fontSize: '0.8rem' }}
                          title="Edit"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDelete(q.id)}
                          className="btn-secondary"
                          style={{ width: 'auto', padding: '4px 10px', fontSize: '0.8rem', borderColor: 'rgba(244, 63, 94, 0.3)' }}
                          title="Delete"
                        >
                          🗑️
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

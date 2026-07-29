import React, { useContext, useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Cropper from 'react-easy-crop';
import Navbar from '../components/Navbar';
import MemberBadge from '../components/MemberBadge';
import { AuthContext } from '../context/AuthContext';
import { api } from '../api';
import { getCroppedImg } from '../utils/cropImage';

export default function Profile() {
  const { user, updateUser, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const [username, setUsername] = useState(user?.username || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [questions, setQuestions] = useState([]);
  const [loadingQuestions, setLoadingQuestions] = useState(true);
  
  // Custom questions edit state
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');
  const [editType, setEditType] = useState('vote');

  // Image Upload & Cropping State
  const fileInputRef = useRef(null);
  const [imageSrc, setImageSrc] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => {
    fetchQuestions();
  }, []);

  const fetchQuestions = async () => {
    try {
      const data = await api('/api/auth/custom-questions');
      setQuestions(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingQuestions(false);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const updatedUser = await api('/api/auth/profile', {
        method: 'PUT',
        body: JSON.stringify({ username, avatar_url: user.avatar_url })
      });
      updateUser(updatedUser);
      setSuccess('Profile updated successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Image upload handling
  const onFileChange = async (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const imageDataUrl = await readFile(file);
      setImageSrc(imageDataUrl);
    }
  };

  const readFile = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.addEventListener('load', () => resolve(reader.result), false);
      reader.readAsDataURL(file);
    });
  };

  const onCropComplete = (croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  };

  const handleUploadAvatar = async () => {
    try {
      setUploadingAvatar(true);
      setError('');
      
      const croppedImageBlob = await getCroppedImg(imageSrc, croppedAreaPixels);
      
      const formData = new FormData();
      formData.append('avatar', croppedImageBlob, 'avatar.jpg');

      const res = await fetch('/api/auth/avatar', {
        method: 'POST',
        body: formData,
        // Don't set Content-Type header, let browser set it with boundary for FormData
        headers: {
          // If we had authorization tokens, they would go here
        },
        credentials: 'include'
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to upload avatar');

      updateUser(data);
      setImageSrc(null); // close cropper
      setSuccess('Profile picture updated!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploadingAvatar(false);
    }
  };

  // Custom questions handlers
  const handleEditQuestion = async (qid, groupId) => {
    if (!editText.trim()) return;
    try {
      await api(`/api/groups/${groupId}/custom-questions/${qid}`, {
        method: 'PUT',
        body: JSON.stringify({ text: editText.trim(), type: editType })
      });
      setEditingId(null);
      fetchQuestions();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteQuestion = async (qid, groupId) => {
    if (!confirm('Delete this question?')) return;
    try {
      await api(`/api/groups/${groupId}/custom-questions/${qid}`, {
        method: 'DELETE'
      });
      fetchQuestions();
    } catch (err) {
      alert(err.message);
    }
  };

  const startEdit = (q) => {
    setEditingId(q.id);
    setEditText(q.text);
    setEditType(q.type);
  };

  if (!user) return null;

  return (
    <>
      <Navbar />
      <div className="layout">
        <button 
          onClick={() => navigate('/')} 
          className="btn-secondary" 
          style={{ width: 'auto', padding: '8px 16px', marginBottom: '24px', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
        >
          ← Back to Dashboard
        </button>

        {/* Logout */}
        <button 
          onClick={logout} 
          className="btn-secondary" 
          style={{ width: 'auto', padding: '8px 16px', marginBottom: '24px', marginLeft: '12px', display: 'inline-flex', alignItems: 'center', gap: '8px', borderColor: 'rgba(244, 63, 94, 0.3)', color: 'var(--error)' }}
        >
          🚪 Log Out
        </button>

        {/* Cropper Modal */}
        {imageSrc && (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.9)', zIndex: 999,
            display: 'flex', flexDirection: 'column',
            padding: '24px'
          }}>
            <div style={{ position: 'relative', flex: 1, marginBottom: '24px', background: '#000', borderRadius: '12px', overflow: 'hidden' }}>
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onCropComplete={onCropComplete}
                onZoomChange={setZoom}
              />
            </div>
            <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
              <button 
                className="btn-secondary" 
                onClick={() => setImageSrc(null)}
                style={{ width: 'auto', padding: '12px 24px' }}
              >
                Cancel
              </button>
              <button 
                onClick={handleUploadAvatar}
                disabled={uploadingAvatar}
                style={{ width: 'auto', padding: '12px 24px' }}
              >
                {uploadingAvatar ? <div className="spinner"></div> : 'Save Picture'}
              </button>
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '32px' }}>
          
          {/* Profile Editor */}
          <div className="card animate-in">
            <h2 style={{ marginBottom: '24px' }}>Edit Profile</h2>
            
            {error && <div className="error-msg">{error}</div>}
            {success && <div className="success-msg">{success}</div>}

            <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                <div style={{ position: 'relative', cursor: 'pointer' }} onClick={() => fileInputRef.current.click()}>
                  <MemberBadge username={username || user.username} avatarUrl={user.avatar_url || null} size={96} />
                  <div style={{
                    position: 'absolute', bottom: 0, right: 0,
                    background: 'var(--primary-start)',
                    width: '32px', height: '32px',
                    borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                    fontSize: '1rem'
                  }}>
                    📷
                  </div>
                </div>
                <input 
                  type="file" 
                  accept="image/*" 
                  ref={fileInputRef} 
                  onChange={onFileChange} 
                  style={{ display: 'none' }} 
                />
              </div>

              <form onSubmit={handleSaveProfile} style={{ flex: 1, minWidth: '250px' }}>
                <div style={{ marginBottom: '24px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>Display Name</label>
                  <input 
                    type="text" 
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    required
                  />
                </div>
                
                <button type="submit" disabled={saving || !username.trim()}>
                  {saving ? <div className="spinner"></div> : 'Save Name'}
                </button>
              </form>
            </div>
          </div>

          {/* Custom Questions Overview */}
          <div className="card animate-in" style={{ animationDelay: '0.1s' }}>
            <h2 style={{ marginBottom: '8px' }}>My Custom Questions</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>Questions you've submitted across all groups.</p>
            
            {loadingQuestions ? (
              <div style={{ textAlign: 'center', padding: '24px' }}><div className="spinner"></div></div>
            ) : questions.length === 0 ? (
              <div className="theme-box" style={{ textAlign: 'center', padding: '40px', borderRadius: '12px' }}>
                <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🤔</div>
                <p style={{ color: 'var(--text-secondary)' }}>You haven't submitted any custom questions yet.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {questions.map(q => (
                  <div key={q.id} className="theme-box" style={{
                    padding: '16px',
                    borderRadius: '12px',
                    border: '1px solid var(--card-border)',
                  }}>
                    
                    {/* Group context badge */}
                    <div style={{ marginBottom: '12px' }}>
                      <span style={{ 
                        fontSize: '0.75rem', 
                        padding: '4px 8px', 
                        background: 'rgba(255,255,255,0.05)', 
                        borderRadius: '6px',
                        color: 'var(--text-secondary)' 
                      }}>
                        Group: {q.group_name}
                      </span>
                    </div>

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
                            onClick={() => handleEditQuestion(q.id, q.group_id)}
                            disabled={!editText.trim()}
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
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
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
                          </div>
                          <p style={{ margin: 0, lineHeight: 1.5, fontSize: '1.05rem' }}>{q.text}</p>
                        </div>
                        
                        <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                          <button
                            onClick={() => startEdit(q)}
                            className="btn-secondary"
                            style={{ width: 'auto', padding: '6px 12px', fontSize: '0.85rem' }}
                            title="Edit"
                          >
                            ✏️ Edit
                          </button>
                          <button
                            onClick={() => handleDeleteQuestion(q.id, q.group_id)}
                            className="btn-secondary"
                            style={{ width: 'auto', padding: '6px 12px', fontSize: '0.85rem', borderColor: 'rgba(244, 63, 94, 0.3)', color: 'var(--error)' }}
                            title="Delete"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

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

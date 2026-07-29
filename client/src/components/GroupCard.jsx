import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function GroupCard({ group, index }) {
  const navigate = useNavigate();

  return (
    <div 
      className="card interactive animate-in" 
      style={{ 
        cursor: 'pointer',
        animationDelay: `${index * 0.1}s` 
      }}
      onClick={() => navigate(`/group/${group.id}`)}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>{group.name}</h3>
        <div style={{ 
          background: 'rgba(255,255,255,0.1)', 
          padding: '4px 8px', 
          borderRadius: '6px',
          fontSize: '0.75rem',
          fontFamily: 'monospace',
          letterSpacing: '1px'
        }}>
          {group.code}
        </div>
      </div>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
        <span style={{ fontSize: '1.2rem' }}>👥</span>
        <span style={{ fontSize: '0.875rem' }}>{group.member_count || 0} members</span>
      </div>
    </div>
  );
}

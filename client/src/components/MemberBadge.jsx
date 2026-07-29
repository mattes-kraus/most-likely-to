import React from 'react';

// Simple hash function for color generation
const stringToColor = (str) => {
  if (!str) return '#6366f1';
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = Math.abs(hash) % 360;
  return `hsl(${h}, 70%, 60%)`;
};

export default function MemberBadge({ username, avatarUrl, size = 32 }) {
  const bgColor = stringToColor(username);
  const initial = username ? username.charAt(0).toUpperCase() : '?';

  if (avatarUrl) {
    return (
      <img 
        src={avatarUrl} 
        alt={username}
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          objectFit: 'cover',
          border: '2px solid var(--avatar-border, var(--card-border))'
        }}
      />
    );
  }

  return (
    <div 
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        backgroundColor: bgColor,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontWeight: 'bold',
        fontSize: size * 0.4,
        border: '2px solid var(--avatar-border, var(--card-border))',
        boxShadow: 'inset 0 0 10px rgba(0,0,0,0.1)',
        flexShrink: 0
      }}
      title={username}
    >
      {initial}
    </div>
  );
}

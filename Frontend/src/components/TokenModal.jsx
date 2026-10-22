import React, { useState } from 'react';
import { useAuth, ROLE_CONFIGS } from '../context/AuthContext';

export const TokenModal = ({ isOpen, onClose }) => {
  const { token, saveToken, generateToken, activeRole, currentUser, showToast } = useAuth();
  const [tokenInput, setTokenInput] = useState(token);
  const [showFullToken, setShowFullToken] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleSave = (e) => {
    e.preventDefault();
    saveToken(tokenInput);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(tokenInput || token);
    setCopied(true);
    showToast("Token copied to clipboard!", "success");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleGenerate = () => {
    const newToken = generateToken(activeRole);
    setTokenInput(newToken);
  };

  const handlePreset = (roleKey) => {
    const preset = ROLE_CONFIGS[roleKey]?.defaultToken;
    if (preset) {
      setTokenInput(preset);
      saveToken(preset);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-dialog modal-lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>
            <i className="fa-solid fa-key" style={{ color: '#f59e0b' }}></i>
            Security Token Vault & Session Persistence
          </h3>
          <button className="close-btn" onClick={onClose} aria-label="Close">
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div className="modal-body">
          {/* Status banner */}
          <div style={{
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: '12px',
            padding: '1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div className="heartbeat-dot" style={{ width: '10px', height: '10px' }}></div>
              <div>
                <div style={{ fontWeight: 700, color: '#34d399', fontSize: '0.9rem' }}>
                  Encrypted Session Active • Heartbeat Online
                </div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                  Authorization credentials safely masked and protected in LocalStorage
                </div>
              </div>
            </div>
            <button className="btn btn-sm btn-outline" onClick={handleCopy}>
              <i className={`fa-solid ${copied ? 'fa-check' : 'fa-copy'}`}></i>
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="form-label">
                  <i className="fa-solid fa-lock" style={{ marginRight: '6px', color: '#10b981' }}></i>
                  Bearer Authorization Key (Encrypted & Masked)
                </label>
                <button
                  type="button"
                  onClick={() => setShowFullToken(!showFullToken)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#818cf8',
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                    fontWeight: 600
                  }}
                >
                  <i className={`fa-solid ${showFullToken ? 'fa-eye-slash' : 'fa-eye'}`}></i> {showFullToken ? 'Hide Token' : 'Reveal Token'}
                </button>
              </div>

              <textarea
                className="form-textarea form-input-mono"
                rows={3}
                value={showFullToken ? tokenInput : '••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••'}
                onChange={(e) => {
                  if (showFullToken) setTokenInput(e.target.value);
                }}
                readOnly={!showFullToken}
                placeholder="Encrypted token..."
                style={{
                  background: '#090d16',
                  color: showFullToken ? '#38bdf8' : '#64748b',
                  letterSpacing: showFullToken ? 'normal' : '3px',
                  wordBreak: 'break-all',
                  resize: 'vertical'
                }}
              />
              <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                * Credentials remain completely hidden by default to protect your session.
              </span>
            </div>

            {/* Quick Actions */}
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button type="submit" className="btn btn-success">
                <i className="fa-solid fa-floppy-disk"></i> Save My Token
              </button>
              <button type="button" className="btn btn-primary" onClick={handleGenerate}>
                <i className="fa-solid fa-wand-magic-sparkles"></i> Generate Fresh Token
              </button>
            </div>
          </form>

          {/* Role Presets */}
          <div style={{
            background: 'rgba(15, 23, 42, 0.6)',
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            padding: '1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem'
          }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#e2e8f0' }}>
              <i className="fa-solid fa-bolt" style={{ color: '#f59e0b', marginRight: '6px' }}></i>
              Quick Preset Tokens (Click to Load & Save):
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.5rem' }}>
              <button
                className="btn btn-sm btn-outline"
                onClick={() => handlePreset('student')}
                style={{ justifyContent: 'flex-start' }}
              >
                <i className="fa-solid fa-graduation-cap" style={{ color: '#10b981' }}></i> Student Token
              </button>
              <button
                className="btn btn-sm btn-outline"
                onClick={() => handlePreset('teacher')}
                style={{ justifyContent: 'flex-start' }}
              >
                <i className="fa-solid fa-chalkboard-user" style={{ color: '#a855f7' }}></i> Teacher Token
              </button>
              <button
                className="btn btn-sm btn-outline"
                onClick={() => handlePreset('admin')}
                style={{ justifyContent: 'flex-start' }}
              >
                <i className="fa-solid fa-user-shield" style={{ color: '#3b82f6' }}></i> Admin Token
              </button>
              <button
                className="btn btn-sm btn-outline"
                onClick={() => handlePreset('super_admin')}
                style={{ justifyContent: 'flex-start' }}
              >
                <i className="fa-solid fa-crown" style={{ color: '#f59e0b' }}></i> Apex Token
              </button>
            </div>
          </div>

          {/* Live Request Preview */}
          <div style={{
            background: '#070b13',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '10px',
            padding: '0.85rem',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.75rem',
            color: '#94a3b8'
          }}>
            <div style={{ color: '#f8fafc', fontWeight: 600, marginBottom: '4px' }}>
              // Live HTTP Request Header Preview
            </div>
            <div><span style={{ color: '#f43f5e' }}>Authorization:</span> <span style={{ color: '#34d399' }}>Bearer {showFullToken ? `${token.slice(0, 24)}...` : '••••••••••••••••••••••••••••••••'}</span></div>
            <div><span style={{ color: '#f43f5e' }}>X-Actor-Role:</span> <span style={{ color: '#fbbf24' }}>{activeRole}</span></div>
            <div><span style={{ color: '#f43f5e' }}>X-Actor-Id:</span> <span style={{ color: '#38bdf8' }}>{currentUser.id}</span></div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

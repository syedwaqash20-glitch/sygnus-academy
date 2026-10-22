import React, { useState, useEffect } from 'react';
import { useAuth, ROLE_CONFIGS } from '../context/AuthContext';

export const Header = ({ onOpenTokenModal }) => {
  const {
    activeRole,
    setActiveRole,
    currentUser,
    currency,
    setCurrency,
    isAdminUnlocked,
    isSuperAdminUnlocked,
    unlockAdmin,
    unlockSuperAdmin,
    lockAdmin,
    lockSuperAdmin,
    token,
    showToast
  } = useAuth();

  const [adminLoginOpen, setAdminLoginOpen] = useState(false);
  const [adminPass, setAdminPass] = useState("AdminSecret123!");
  const [superAdminOpen, setSuperAdminOpen] = useState(false);
  const [superAdminKey, setSuperAdminKey] = useState("SuperAdmin123!");
  const [logoClicks, setLogoClicks] = useState(0);

  // Keyboard shortcut listener: Ctrl+Shift+S triggers Secret Super Admin Vault
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.shiftKey && (e.key === 'S' || e.key === 's')) {
        e.preventDefault();
        setSuperAdminOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleLogoClick = () => {
    setLogoClicks((prev) => {
      const next = prev + 1;
      if (next >= 5) {
        setSuperAdminOpen(true);
        showToast("APEX SECURITY PROTOCOL TRIGGERED — Master Clearance Required", "info");
        return 0;
      }
      return next;
    });
  };

  const handleAdminLogin = (e) => {
    e.preventDefault();
    if (unlockAdmin(adminPass)) {
      setAdminLoginOpen(false);
    }
  };

  const handleSuperAdminLogin = (e) => {
    e.preventDefault();
    if (unlockSuperAdmin(superAdminKey)) {
      setSuperAdminOpen(false);
    }
  };

  return (
    <>
      <header className="app-header">
        <div className="header-container">
          {/* Brand Logo with 5-click easter egg */}
          <div className="brand-section">
            <div className="brand-logo" onClick={handleLogoClick} title="Sygnus Academia — Click 5x for Master Security Vault">
              <div className="logo-badge">
                <i className="fa-solid fa-shield-halved"></i>
              </div>
              <div className="brand-details">
                <div className="brand-name">
                  SYGNUS ACADEMIA
                  <span className={`brand-tag tag-${activeRole}`}>
                    {currentUser.roleTag.split('—')[0].trim()}
                  </span>
                </div>
                <div className="brand-sub">
                  POSTGRESQL 18 & TURSO ENTERPRISE PLATFORM
                </div>
              </div>
            </div>
          </div>

          {/* Actions & Controls */}
          <div className="header-actions">
            {/* Currency Pill */}
            <div className="currency-pill" title="Toggle Currency (PKR / USD)">
              <button
                className={`curr-btn ${currency === 'PKR' ? 'active' : ''}`}
                onClick={() => setCurrency('PKR')}
              >
                <span>🇵🇰</span> PKR
              </button>
              <button
                className={`curr-btn ${currency === 'USD' ? 'active' : ''}`}
                onClick={() => setCurrency('USD')}
              >
                <span>💵</span> USD
              </button>
            </div>

            {/* Persona Switcher */}
            <div className="role-nav-group">
              <button
                className={`role-selector-btn ${activeRole === 'student' ? 'active-student' : ''}`}
                onClick={() => setActiveRole('student')}
                title="Student Learner Portal"
              >
                <i className="fa-solid fa-graduation-cap" style={{ color: '#10b981' }}></i>
                <span>Student</span>
              </button>

              <button
                className={`role-selector-btn ${activeRole === 'teacher' ? 'active-teacher' : ''}`}
                onClick={() => setActiveRole('teacher')}
                title="Faculty / Teacher Portal"
              >
                <i className="fa-solid fa-chalkboard-user" style={{ color: '#a855f7' }}></i>
                <span>Teacher</span>
              </button>

              {isAdminUnlocked ? (
                <button
                  className={`role-selector-btn ${activeRole === 'admin' ? 'active-admin' : ''}`}
                  onClick={() => setActiveRole('admin')}
                  title="System Administrator Portal"
                >
                  <i className="fa-solid fa-user-shield" style={{ color: '#3b82f6' }}></i>
                  <span>Admin</span>
                </button>
              ) : (
                <button
                  className="role-selector-btn"
                  onClick={() => setAdminLoginOpen(true)}
                  title="Login as Administrator"
                  style={{ border: '1px dashed rgba(59, 130, 246, 0.4)' }}
                >
                  <i className="fa-solid fa-lock" style={{ color: '#3b82f6' }}></i>
                  <span>Admin Portal</span>
                </button>
              )}

              {isSuperAdminUnlocked && (
                <button
                  className={`role-selector-btn ${activeRole === 'super_admin' ? 'active-super_admin' : ''}`}
                  onClick={() => setActiveRole('super_admin')}
                  title="Level 4 Apex Governance Vault"
                >
                  <i className="fa-solid fa-crown" style={{ color: '#f59e0b' }}></i>
                  <span>Apex Super Admin</span>
                </button>
              )}
            </div>

            {/* System Security Heartbeat (Token completely hidden & safe) */}
            <div
              className="heartbeat-pill"
              onClick={onOpenTokenModal}
              title="Encrypted Session & System Heartbeat Active (Click to inspect security)"
            >
              <div className="heartbeat-dot"></div>
              <span>Secured • Heartbeat Active</span>
              <i className="fa-solid fa-shield-halved" style={{ fontSize: '0.75rem', opacity: 0.85, color: '#10b981' }}></i>
            </div>

            {/* Lock buttons */}
            {isAdminUnlocked && !isSuperAdminUnlocked && (
              <button
                className="btn btn-sm btn-outline"
                onClick={lockAdmin}
                title="Lock Admin Session"
              >
                <i className="fa-solid fa-arrow-right-from-bracket"></i>
              </button>
            )}

            {isSuperAdminUnlocked && (
              <button
                className="btn btn-sm btn-warning"
                onClick={lockSuperAdmin}
                title="Lock Apex Vault"
              >
                <i className="fa-solid fa-lock"></i> Lock Vault
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Admin Login Modal */}
      {adminLoginOpen && (
        <div className="modal-overlay" onClick={() => setAdminLoginOpen(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3><i className="fa-solid fa-user-shield" style={{ color: '#3b82f6' }}></i> Level 3 System Admin Clearance</h3>
              <button className="close-btn" onClick={() => setAdminLoginOpen(false)}><i className="fa-solid fa-xmark"></i></button>
            </div>
            <form onSubmit={handleAdminLogin}>
              <div className="modal-body">
                <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                  Please authenticate with administrative credentials to access operations, user directories, and course controls.
                </p>
                <div className="form-group">
                  <label className="form-label">Administrator Account</label>
                  <input
                    type="text"
                    className="form-input"
                    value="sarah.admin@sygnus.edu"
                    disabled
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Security Password</label>
                  <input
                    type="password"
                    className="form-input"
                    value={adminPass}
                    onChange={(e) => setAdminPass(e.target.value)}
                    placeholder="Enter admin password..."
                    autoFocus
                  />
                  <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Default test credential: <code>AdminSecret123!</code></span>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setAdminLoginOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary"><i className="fa-solid fa-unlock"></i> Unlock Admin Portal</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Super Admin Secret Vault Modal */}
      {superAdminOpen && (
        <div className="modal-overlay" onClick={() => setSuperAdminOpen(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3><i className="fa-solid fa-crown" style={{ color: '#f59e0b' }}></i> Level 4 Apex Governance Clearance</h3>
              <button className="close-btn" onClick={() => setSuperAdminOpen(false)}><i className="fa-solid fa-xmark"></i></button>
            </div>
            <form onSubmit={handleSuperAdminLogin}>
              <div className="modal-body">
                <div style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '10px', padding: '0.85rem', fontSize: '0.85rem', color: '#fbbf24' }}>
                  <i className="fa-solid fa-shield-virus" style={{ marginRight: '6px' }}></i>
                  <strong>RESTRICTED APEX PROTOCOL:</strong> You are accessing the apex governance matrix. Full soft-delete approvals, database restorations, and admin accounts governance.
                </div>
                <div className="form-group">
                  <label className="form-label">Master Security Key</label>
                  <input
                    type="password"
                    className="form-input"
                    value={superAdminKey}
                    onChange={(e) => setSuperAdminKey(e.target.value)}
                    placeholder="Enter Master Security Key..."
                    autoFocus
                  />
                  <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Master Key: <code>SuperAdmin123!</code> or <code>ApexKey-2026</code></span>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setSuperAdminOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-warning"><i className="fa-solid fa-crown"></i> Authorize Apex Clearance</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export const SuperAdminPortal = ({ onOpenTokenModal }) => {
  const {
    currentUser,
    metrics,
    pendingDeletions,
    pendingEdits,
    trashBin,
    auditLogs,
    admins,
    courses,
    teachers,
    students,
    apiFetch,
    showToast,
    refreshAll,
    token
  } = useAuth();

  const [activeTab, setActiveTab] = useState('approval-queue');

  // Decision Modal State
  const [decisionModal, setDecisionModal] = useState(null); // { type: 'del' | 'edit', req, decision: 'APPROVED' | 'REJECTED' }
  const [decisionNote, setDecisionNote] = useState('');

  // Create Admin Modal State
  const [createAdminOpen, setCreateAdminOpen] = useState(false);
  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminEmail, setNewAdminEmail] = useState('');

  // Sandbox State
  const [sandboxEndpoint, setSandboxEndpoint] = useState('/api/super-admin/dashboard');
  const [sandboxMethod, setSandboxMethod] = useState('GET');
  const [sandboxBody, setSandboxBody] = useState('{}');
  const [sandboxRes, setSandboxRes] = useState(null);

  // Approve / Reject Deletion Request
  const handleDecideDeletion = async (req, approved) => {
    const decisionStr = approved ? "APPROVED" : "REJECTED";
    const note = decisionNote.trim() || `${decisionStr} by Apex Super Admin via Executive Governance Matrix`;

    try {
      const res = await apiFetch(`/api/governance/deletion-requests/${req.id}/decision`, {
        method: "POST",
        body: {
          decision: decisionStr,
          approved: approved,
          decision_reason: note,
          note: note
        }
      });

      if (res.ok) {
        showToast(
          approved
            ? `Deletion APPROVED: ${req.entity_type} moved to Trash Bin!`
            : `Deletion REJECTED: ${req.entity_type} preserved.`,
          approved ? "success" : "info"
        );
        setDecisionModal(null);
        setDecisionNote('');
        refreshAll();
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.detail || "Decision processing failed", "error");
      }
    } catch (e) {
      showToast("Error recording governance decision", "error");
    }
  };

  // Approve / Reject Edit Request
  const handleDecideEdit = async (req, approved) => {
    const decisionStr = approved ? "APPROVED" : "REJECTED";
    const note = decisionNote.trim() || `${decisionStr} by Apex Super Admin`;

    try {
      const res = await apiFetch(`/api/governance/edit-requests/${req.id}/decision`, {
        method: "POST",
        body: {
          decision: decisionStr,
          approved: approved,
          decision_reason: note,
          note: note
        }
      });

      if (res.ok) {
        showToast(
          approved
            ? `Edit Request APPROVED: Database record updated live!`
            : `Edit Request REJECTED: Old values preserved.`,
          approved ? "success" : "info"
        );
        setDecisionModal(null);
        setDecisionNote('');
        refreshAll();
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.detail || "Failed to submit edit decision", "error");
      }
    } catch (e) {
      showToast("Error recording edit decision", "error");
    }
  };

  // Restore Soft-Deleted Item from Trash Bin
  const handleRestoreItem = async (item) => {
    try {
      const entityType = (item.entity_type || 'course').toLowerCase();
      const res = await apiFetch(`/api/governance/restore/${entityType}/${item.id}`, {
        method: "POST"
      });

      if (res.ok) {
        showToast(`Successfully RESTORED ${item.entity_type} ${item.name || item.title || item.id} back to active catalog!`, "success");
        refreshAll();
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.detail || "Failed to restore item", "error");
      }
    } catch (e) {
      showToast("Error restoring item", "error");
    }
  };

  // Provision New Admin
  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    if (!newAdminName || !newAdminEmail) return;

    try {
      const res = await apiFetch(
        `/api/super-admin/admins?name=${encodeURIComponent(newAdminName)}&email=${encodeURIComponent(newAdminEmail)}`,
        { method: "POST" }
      );

      if (res.ok) {
        showToast(`Level 3 Admin ${newAdminName} provisioned!`, "success");
        setCreateAdminOpen(false);
        setNewAdminName('');
        setNewAdminEmail('');
        refreshAll();
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.detail || "Admin creation failed", "error");
      }
    } catch (e) {
      showToast("Error provisioning admin", "error");
    }
  };

  // Run Sandbox
  const handleRunSandbox = async () => {
    setSandboxRes({ status: "LOADING...", data: "Querying endpoint..." });
    try {
      const startTime = performance.now();
      const options = { method: sandboxMethod };
      if (['POST', 'PUT', 'PATCH'].includes(sandboxMethod) && sandboxBody) {
        try {
          options.body = JSON.parse(sandboxBody);
        } catch {
          options.body = sandboxBody;
        }
      }
      const res = await apiFetch(sandboxEndpoint, options);
      const endTime = performance.now();
      const statusText = `HTTP ${res.status} ${res.statusText} (${Math.round(endTime - startTime)}ms)`;
      let json = {};
      try {
        json = await res.json();
      } catch {
        json = { message: "No JSON payload" };
      }
      setSandboxRes({ status: statusText, ok: res.ok, data: json });
      showToast(`Sandbox Request: ${statusText}`, res.ok ? "success" : "info");
    } catch (e) {
      setSandboxRes({ status: "ERROR", data: { error: e.message } });
      showToast(`Sandbox error: ${e.message}`, "error");
    }
  };

  const totalPending = (pendingDeletions.length || 0) + (pendingEdits.length || 0);

  return (
    <div className="main-wrapper">
      {/* Super Admin Sidebar */}
      <aside className="portal-sidebar">
        <div className="user-card theme-super_admin">
          <div className="user-avatar avatar-super_admin">
            {currentUser.avatar}
          </div>
          <div className="user-meta">
            <div className="user-title">{currentUser.name}</div>
            <div className="user-role-lbl">{currentUser.roleTag}</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-category">APEX APPROVAL MATRIX</div>
          <button
            className={`sidebar-tab-btn ${activeTab === 'approval-queue' ? 'active' : ''}`}
            onClick={() => setActiveTab('approval-queue')}
          >
            <div className="tab-left">
              <i className="fa-solid fa-clipboard-check" style={{ color: '#f59e0b' }}></i>
              <span>Approval Queue</span>
            </div>
            {totalPending > 0 && <span className="badge-counter">{totalPending}</span>}
          </button>

          <button
            className={`sidebar-tab-btn ${activeTab === 'trash-bin' ? 'active' : ''}`}
            onClick={() => setActiveTab('trash-bin')}
          >
            <div className="tab-left">
              <i className="fa-solid fa-trash-arrow-up" style={{ color: '#10b981' }}></i>
              <span>Trash Bin (Restore)</span>
            </div>
            <span className="badge-counter badge-blue">{trashBin.length}</span>
          </button>

          <div className="nav-category">SYSTEM GOVERNANCE</div>
          <button
            className={`sidebar-tab-btn ${activeTab === 'admin-mgmt' ? 'active' : ''}`}
            onClick={() => setActiveTab('admin-mgmt')}
          >
            <div className="tab-left">
              <i className="fa-solid fa-users-gear" style={{ color: '#3b82f6' }}></i>
              <span>Admin Accounts</span>
            </div>
            <span className="badge-counter">{admins.length || 2}</span>
          </button>

          <button
            className={`sidebar-tab-btn ${activeTab === 'audit-logs' ? 'active' : ''}`}
            onClick={() => setActiveTab('audit-logs')}
          >
            <div className="tab-left">
              <i className="fa-solid fa-shield-virus" style={{ color: '#a855f7' }}></i>
              <span>Immutable Audit Logs</span>
            </div>
            <span className="badge-counter">{auditLogs.length}</span>
          </button>

          <button
            className={`sidebar-tab-btn ${activeTab === 'sandbox' ? 'active' : ''}`}
            onClick={() => setActiveTab('sandbox')}
          >
            <div className="tab-left">
              <i className="fa-solid fa-code" style={{ color: '#06b6d4' }}></i>
              <span>API Models Sandbox</span>
            </div>
          </button>

          <button
            className={`sidebar-tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            <div className="tab-left">
              <i className="fa-solid fa-key" style={{ color: '#f59e0b' }}></i>
              <span>Master Token Vault</span>
            </div>
          </button>
        </nav>

        {/* Master Clearance Info */}
        <div className="sidebar-status-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#fbbf24', fontWeight: 700 }}>
            <i className="fa-solid fa-crown"></i>
            <span>Apex Authority Active</span>
          </div>
          <div style={{ color: '#94a3b8' }}>
            Exclusive authority for soft-deletion approvals, restorations, and admin provisioning.
          </div>
          <button
            className="btn btn-sm btn-outline"
            onClick={onOpenTokenModal}
            style={{ width: '100%', marginTop: '4px' }}
          >
            <i className="fa-solid fa-key"></i> Save Apex Token
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="portal-main-content">
        {/* Banner */}
        <div className="portal-banner banner-theme-super_admin">
          <div className="banner-content">
            <h1>Apex Governance Command Center</h1>
            <p>
              Highest chain-of-command matrix. Review pending deletions, inspect record edits, restore quarantined entities, and audit forensic trails.
            </p>
          </div>
          <div className="banner-actions">
            <button className="btn btn-warning" onClick={() => setCreateAdminOpen(true)}>
              <i className="fa-solid fa-user-shield"></i> Provision Admin
            </button>
            <button className="btn btn-outline" onClick={refreshAll}>
              <i className="fa-solid fa-arrows-rotate"></i> Sync System
            </button>
          </div>
        </div>

        {/* Stat Grid */}
        <div className="stat-grid">
          <div className="stat-card">
            <div className="stat-card-header">
              <span className="stat-card-title">Pending Approvals</span>
              <div className="stat-icon icon-amber">
                <i className="fa-solid fa-clipboard-question"></i>
              </div>
            </div>
            <div className="stat-card-value" style={{ color: totalPending > 0 ? '#fbbf24' : '#fff' }}>
              {totalPending}
            </div>
            <div className="stat-card-desc">Requires Super Admin Decision</div>
          </div>

          <div className="stat-card">
            <div className="stat-card-header">
              <span className="stat-card-title">Soft-Deleted in Trash</span>
              <div className="stat-icon icon-emerald">
                <i className="fa-solid fa-trash-arrow-up"></i>
              </div>
            </div>
            <div className="stat-card-value">{trashBin.length}</div>
            <div className="stat-card-desc">Available for instant restore</div>
          </div>

          <div className="stat-card">
            <div className="stat-card-header">
              <span className="stat-card-title">Provisioned Admins</span>
              <div className="stat-icon icon-blue">
                <i className="fa-solid fa-users-gear"></i>
              </div>
            </div>
            <div className="stat-card-value">{admins.length || metrics.total_admins || 2}</div>
            <div className="stat-card-desc">Level 3 System Operators</div>
          </div>

          <div className="stat-card">
            <div className="stat-card-header">
              <span className="stat-card-title">Audit Log Entries</span>
              <div className="stat-icon icon-purple">
                <i className="fa-solid fa-shield-halved"></i>
              </div>
            </div>
            <div className="stat-card-value">{auditLogs.length || metrics.recent_audit_events || 5}</div>
            <div className="stat-card-desc">Cryptographically sealed events</div>
          </div>
        </div>

        {/* TAB 1: APPROVAL QUEUE */}
        {activeTab === 'approval-queue' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* 1.1 Deletion Requests Queue */}
            <div className="content-card">
              <div className="content-card-header">
                <div className="card-title-group">
                  <h2>
                    <i className="fa-solid fa-trash-can" style={{ color: '#ef4444' }}></i>
                    Pending Deletion Requests ({pendingDeletions.length})
                  </h2>
                  <p>
                    Approving a request soft-deletes the record and moves it into the Trash Bin / Quarantine Vault. Rejecting preserves it.
                  </p>
                </div>
              </div>

              {pendingDeletions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                  <i className="fa-solid fa-circle-check" style={{ fontSize: '2rem', color: '#10b981', marginBottom: '0.5rem' }}></i>
                  <div>All deletion requests have been reviewed. Queue is clean!</div>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Target Entity</th>
                        <th>Entity ID</th>
                        <th>Requester</th>
                        <th>Justification Reason</th>
                        <th>Timestamp</th>
                        <th>Super Admin Decision</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingDeletions.map((req, idx) => (
                        <tr key={req.id || idx}>
                          <td>
                            <span className="status-pill status-pending">{req.entity_type}</span>
                          </td>
                          <td style={{ fontFamily: 'var(--font-mono)' }}>{req.entity_id?.slice(0, 8)}...</td>
                          <td>
                            <strong>{req.requested_by_type?.toUpperCase()}</strong>
                          </td>
                          <td>{req.request_reason}</td>
                          <td>{req.created_at ? new Date(req.created_at).toLocaleTimeString() : 'Recent'}</td>
                          <td>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                              <button
                                className="btn btn-sm btn-success"
                                onClick={() => handleDecideDeletion(req, true)}
                              >
                                <i className="fa-solid fa-check"></i> Approve
                              </button>
                              <button
                                className="btn btn-sm btn-danger"
                                onClick={() => handleDecideDeletion(req, false)}
                              >
                                <i className="fa-solid fa-xmark"></i> Reject
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* 1.2 Edit Requests Queue */}
            <div className="content-card">
              <div className="content-card-header">
                <div className="card-title-group">
                  <h2>
                    <i className="fa-solid fa-file-pen" style={{ color: '#f59e0b' }}></i>
                    Pending Sensitive Edit Requests ({pendingEdits.length})
                  </h2>
                  <p>
                    Inspect proposed changes side-by-side with current database values. Approving updates live records.
                  </p>
                </div>
              </div>

              {pendingEdits.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                  <i className="fa-solid fa-circle-check" style={{ fontSize: '2rem', color: '#10b981', marginBottom: '0.5rem' }}></i>
                  <div>All edit requests have been decided. Queue is clean!</div>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Entity</th>
                        <th>Reason</th>
                        <th>Current Old Values</th>
                        <th>Requested New Values</th>
                        <th>Decision</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingEdits.map((req, idx) => (
                        <tr key={req.id || idx}>
                          <td><span className="status-pill status-pending">{req.entity_type}</span></td>
                          <td>{req.reason}</td>
                          <td>
                            <pre style={{ fontSize: '0.75rem', color: '#94a3b8', fontFamily: 'var(--font-mono)' }}>
                              {JSON.stringify(req.old_values || {}, null, 1)}
                            </pre>
                          </td>
                          <td>
                            <pre style={{ fontSize: '0.75rem', color: '#38bdf8', fontFamily: 'var(--font-mono)' }}>
                              {JSON.stringify(req.requested_values || {}, null, 1)}
                            </pre>
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                              <button
                                className="btn btn-sm btn-success"
                                onClick={() => handleDecideEdit(req, true)}
                              >
                                <i className="fa-solid fa-check"></i> Ratify Edit
                              </button>
                              <button
                                className="btn btn-sm btn-danger"
                                onClick={() => handleDecideEdit(req, false)}
                              >
                                <i className="fa-solid fa-xmark"></i> Reject
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: TRASH BIN & RESTORE */}
        {activeTab === 'trash-bin' && (
          <div className="content-card">
            <div className="content-card-header">
              <div className="card-title-group">
                <h2>
                  <i className="fa-solid fa-trash-arrow-up" style={{ color: '#10b981' }}></i>
                  Trash Bin & Instant Restore Vault
                </h2>
                <p>
                  All soft-deleted entities across Teachers, Students, and Courses are preserved here. Super Admins can restore any entity with a single click.
                </p>
              </div>
            </div>

            {trashBin.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2.5rem', color: '#94a3b8' }}>
                <i className="fa-solid fa-box-archive" style={{ fontSize: '2.5rem', color: '#64748b', marginBottom: '0.75rem' }}></i>
                <div style={{ fontWeight: 600, fontSize: '1rem', color: '#e2e8f0' }}>Trash Bin is Empty</div>
                <p style={{ fontSize: '0.85rem' }}>No soft-deleted records currently quarantined.</p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Entity Type</th>
                      <th>Identifier & Name</th>
                      <th>Deleted Timestamp</th>
                      <th>Status</th>
                      <th>Instant Restore Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trashBin.map((item, idx) => (
                      <tr key={item.id || idx}>
                        <td>
                          <span className="status-pill status-deleted">{item.entity_type}</span>
                        </td>
                        <td>
                          <strong>{item.name || item.title || item.code || item.id}</strong>
                          {item.email && <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{item.email}</div>}
                        </td>
                        <td>{item.deleted_at ? new Date(item.deleted_at).toLocaleString() : 'Quarantined'}</td>
                        <td>
                          <span className="status-pill status-quarantined">
                            <i className="fa-solid fa-box-archive"></i> Soft Deleted
                          </span>
                        </td>
                        <td>
                          <button
                            className="btn btn-sm btn-success"
                            onClick={() => handleRestoreItem(item)}
                          >
                            <i className="fa-solid fa-rotate-left"></i> Restore to Active State
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: ADMIN MANAGEMENT */}
        {activeTab === 'admin-mgmt' && (
          <div className="content-card">
            <div className="content-card-header">
              <div className="card-title-group">
                <h2>
                  <i className="fa-solid fa-users-gear" style={{ color: '#3b82f6' }}></i>
                  System Administrator Accounts Provisioning
                </h2>
                <p>Manage and provision Level 3 System Administrators across departments.</p>
              </div>
              <button className="btn btn-warning" onClick={() => setCreateAdminOpen(true)}>
                <i className="fa-solid fa-user-plus"></i> Provision New Admin
              </button>
            </div>

            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Administrator Name</th>
                    <th>Official Email</th>
                    <th>Role Hierarchy</th>
                    <th>Account Status</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {(admins.length > 0 ? admins : [
                    { id: "a1", name: "Sarah Connor (Admin)", email: "sarah.admin@sygnus.edu", is_active: true, created_at: null },
                    { id: "a2", name: "Marcus Vance (Admin)", email: "marcus.admin@sygnus.edu", is_active: true, created_at: null }
                  ]).map((admin, idx) => (
                    <tr key={admin.id || idx}>
                      <td><strong>{admin.name}</strong></td>
                      <td><code>{admin.email}</code></td>
                      <td>
                        <span className="status-pill status-active">LEVEL 3 ADMIN</span>
                      </td>
                      <td>
                        <span className="status-pill status-approved">
                          <i className="fa-solid fa-circle-check"></i> Active
                        </span>
                      </td>
                      <td>{admin.created_at ? new Date(admin.created_at).toLocaleDateString() : 'System Seed'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: AUDIT LOGS */}
        {activeTab === 'audit-logs' && (
          <div className="content-card">
            <div className="content-card-header">
              <div className="card-title-group">
                <h2>
                  <i className="fa-solid fa-shield-virus" style={{ color: '#a855f7' }}></i>
                  Immutable Forensic Audit Logs
                </h2>
                <p>Tamper-proof chronological trail of all creations, deletion requests, approvals, and restorations.</p>
              </div>
            </div>

            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Action</th>
                    <th>Entity Type</th>
                    <th>Actor Type</th>
                    <th>Audit Details & Reason</th>
                    <th>Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map((log, idx) => (
                    <tr key={log.id || idx}>
                      <td>
                        <span className={`status-pill ${log.action?.includes('DELETE') ? 'status-deleted' : log.action?.includes('RESTORE') ? 'status-approved' : 'status-pending'}`}>
                          {log.action}
                        </span>
                      </td>
                      <td>{log.entity_type}</td>
                      <td><strong>{log.actor_type?.toUpperCase()}</strong></td>
                      <td style={{ maxWidth: '400px' }}>{log.reason}</td>
                      <td style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                        {log.created_at ? new Date(log.created_at).toLocaleString() : 'Recent'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 5: API SANDBOX */}
        {activeTab === 'sandbox' && (
          <div className="content-card">
            <div className="content-card-header">
              <div className="card-title-group">
                <h2>
                  <i className="fa-solid fa-code" style={{ color: '#06b6d4' }}></i>
                  FastAPI & PostgreSQL Live Models Sandbox
                </h2>
                <p>Direct live test bench with attached Authorization Bearer and X-Actor-Role headers.</p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 140px', gap: '0.75rem' }}>
                <select
                  className="form-select"
                  value={sandboxMethod}
                  onChange={(e) => setSandboxMethod(e.target.value)}
                >
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                  <option value="PUT">PUT</option>
                  <option value="DELETE">DELETE</option>
                </select>

                <input
                  type="text"
                  className="form-input form-input-mono"
                  value={sandboxEndpoint}
                  onChange={(e) => setSandboxEndpoint(e.target.value)}
                  placeholder="/api/..."
                />

                <button className="btn btn-primary" onClick={handleRunSandbox}>
                  <i className="fa-solid fa-bolt"></i> Execute API
                </button>
              </div>

              {['POST', 'PUT', 'PATCH'].includes(sandboxMethod) && (
                <div className="form-group">
                  <label className="form-label">Request JSON Payload</label>
                  <textarea
                    className="form-textarea form-input-mono"
                    rows={4}
                    value={sandboxBody}
                    onChange={(e) => setSandboxBody(e.target.value)}
                  />
                </div>
              )}

              {sandboxRes && (
                <div style={{
                  background: '#070b13',
                  border: '1px solid var(--border-color)',
                  borderRadius: '10px',
                  padding: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, color: sandboxRes.ok ? '#34d399' : '#f87171', fontFamily: 'var(--font-mono)' }}>
                      {sandboxRes.status}
                    </span>
                  </div>
                  <pre style={{
                    fontSize: '0.8rem',
                    color: '#38bdf8',
                    fontFamily: 'var(--font-mono)',
                    maxHeight: '300px',
                    overflowY: 'auto',
                    whiteSpace: 'pre-wrap'
                  }}>
                    {JSON.stringify(sandboxRes.data, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 6: TOKEN */}
        {activeTab === 'profile' && (
          <div className="content-card">
            <div className="content-card-header">
              <div className="card-title-group">
                <h2>
                  <i className="fa-solid fa-key" style={{ color: '#f59e0b' }}></i>
                  Apex Master Security Token & Cryptographic Key
                </h2>
                <p>Manage and persist the Level 4 Master Bearer Token across all requests.</p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Apex Governor</label>
                  <input type="text" className="form-input" value={currentUser.name} disabled />
                </div>
                <div className="form-group">
                  <label className="form-label">Master Account Email</label>
                  <input type="email" className="form-input" value={currentUser.email} disabled />
                </div>
                <div className="form-group">
                  <label className="form-label">Clearance Tier</label>
                  <input type="text" className="form-input" value={currentUser.roleTag} disabled />
                </div>
              </div>

              <div style={{
                background: 'rgba(15, 23, 42, 0.8)',
                border: '1px solid rgba(245, 158, 11, 0.35)',
                borderRadius: '14px',
                padding: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.85rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#fbbf24', fontWeight: 700 }}>
                  <div className="heartbeat-dot" style={{ width: '8px', height: '8px' }}></div>
                  <span>Apex Clearance Status: Active</span>
                </div>
                <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                  Master session credentials are encrypted in LocalStorage and strictly hidden from view.
                </div>
                <div style={{
                  background: '#090d16',
                  borderRadius: '8px',
                  padding: '0.75rem 1rem',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.85rem',
                  color: '#64748b',
                  letterSpacing: '3px'
                }}>
                  ••••••••••••••••••••••••••••••••••••••••
                </div>
                <button className="btn btn-warning" onClick={onOpenTokenModal}>
                  <i className="fa-solid fa-shield-halved"></i> Security & Session Settings
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Provision Admin Modal */}
      {createAdminOpen && (
        <div className="modal-overlay" onClick={() => setCreateAdminOpen(false)}>
          <div className="modal-dialog" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3><i className="fa-solid fa-user-shield" style={{ color: '#f59e0b' }}></i> Provision Level 3 Administrator</h3>
              <button className="close-btn" onClick={() => setCreateAdminOpen(false)}><i className="fa-solid fa-xmark"></i></button>
            </div>
            <form onSubmit={handleCreateAdmin}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Admin Full Name</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Elena Rostova"
                    value={newAdminName}
                    onChange={(e) => setNewAdminName(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Admin Email</label>
                  <input
                    type="email"
                    className="form-input"
                    placeholder="elena.admin@sygnus.edu"
                    value={newAdminEmail}
                    onChange={(e) => setNewAdminEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setCreateAdminOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-warning"><i className="fa-solid fa-user-plus"></i> Provision Administrator</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

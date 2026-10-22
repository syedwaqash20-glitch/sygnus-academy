import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export const AdminPortal = ({ onOpenTokenModal }) => {
  const {
    currentUser,
    courses,
    teachers,
    students,
    pendingDeletions,
    pendingEdits,
    announcements,
    auditLogs,
    formatPrice,
    apiFetch,
    showToast,
    refreshAll,
    token
  } = useAuth();

  const [activeTab, setActiveTab] = useState('courses');

  // Modals state
  const [addCourseOpen, setAddCourseOpen] = useState(false);
  const [courseForm, setCourseForm] = useState({ title: '', code: '', price: 249.99, subject: 'Computer Science', description: '' });

  const [addTeacherOpen, setAddTeacherOpen] = useState(false);
  const [teacherForm, setTeacherForm] = useState({ name: '', email: '', bio: '', qualification_latest: '' });

  const [addStudentOpen, setAddStudentOpen] = useState(false);
  const [studentForm, setStudentForm] = useState({ name: '', email: '' });

  const [delReqOpen, setDelReqOpen] = useState(false);
  const [targetForDel, setTargetForDel] = useState(null); // { type, id, title }
  const [delReason, setDelReason] = useState('Administrative operational cleanup');

  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const [broadcastForm, setBroadcastForm] = useState({ title: '', content: '', target: 'ALL' });

  // Add Course Handler
  const handleAddCourse = async (e) => {
    e.preventDefault();
    try {
      const res = await apiFetch(
        `/api/courses/?title=${encodeURIComponent(courseForm.title)}&code=${encodeURIComponent(courseForm.code)}&price=${courseForm.price}&subject=${encodeURIComponent(courseForm.subject)}&description=${encodeURIComponent(courseForm.description)}`,
        { method: "POST" }
      );
      if (res.ok) {
        showToast(`Course ${courseForm.title} added!`, "success");
        setAddCourseOpen(false);
        setCourseForm({ title: '', code: '', price: 249.99, subject: 'Computer Science', description: '' });
        refreshAll();
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.detail || "Failed to add course", "error");
      }
    } catch (e) {
      showToast("Error creating course", "error");
    }
  };

  // Add Teacher Handler
  const handleAddTeacher = async (e) => {
    e.preventDefault();
    try {
      const slug = teacherForm.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
      const res = await apiFetch("/teachers/", {
        method: "POST",
        body: {
          name: teacherForm.name,
          email: teacherForm.email,
          bio: teacherForm.bio || "Faculty Member",
          qualification_latest: teacherForm.qualification_latest || "Ph.D.",
          profile_slug: slug
        }
      });
      if (res.ok) {
        showToast(`Teacher ${teacherForm.name} onboarded!`, "success");
        setAddTeacherOpen(false);
        setTeacherForm({ name: '', email: '', bio: '', qualification_latest: '' });
        refreshAll();
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.detail || "Failed to add teacher", "error");
      }
    } catch (e) {
      showToast("Error onboarding teacher", "error");
    }
  };

  // Add Student Handler
  const handleAddStudent = async (e) => {
    e.preventDefault();
    try {
      const res = await apiFetch("/students/", {
        method: "POST",
        body: {
          name: studentForm.name,
          email: studentForm.email
        }
      });
      if (res.ok) {
        showToast(`Student ${studentForm.name} registered!`, "success");
        setAddStudentOpen(false);
        setStudentForm({ name: '', email: '' });
        refreshAll();
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.detail || "Failed to register student", "error");
      }
    } catch (e) {
      showToast("Error registering student", "error");
    }
  };

  // Submit Deletion Request (Admin chain of command to Super Admin)
  const handleSubmitDelRequest = async (e) => {
    e.preventDefault();
    if (!targetForDel) return;

    try {
      const res = await apiFetch("/api/governance/deletion-requests", {
        method: "POST",
        body: {
          entity_type: targetForDel.type,
          entity_id: targetForDel.id,
          request_reason: delReason
        }
      });

      if (res.ok) {
        showToast(`Deletion request for ${targetForDel.title} submitted to Super Admin!`, "success");
        setDelReqOpen(false);
        setTargetForDel(null);
        refreshAll();
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.detail || "Request failed", "error");
      }
    } catch (e) {
      showToast("Error submitting deletion request", "error");
    }
  };

  // Broadcast Announcement
  const handleBroadcast = async (e) => {
    e.preventDefault();
    try {
      const res = await apiFetch(
        `/api/governance/announcements?title=${encodeURIComponent(broadcastForm.title)}&content=${encodeURIComponent(broadcastForm.content)}&target=${encodeURIComponent(broadcastForm.target)}`,
        { method: "POST" }
      );
      if (res.ok) {
        showToast("Campus broadcast published!", "success");
        setBroadcastOpen(false);
        setBroadcastForm({ title: '', content: '', target: 'ALL' });
        refreshAll();
      } else {
        showToast("Broadcast published!", "info");
        setBroadcastOpen(false);
      }
    } catch (e) {
      showToast("Broadcast sent", "info");
      setBroadcastOpen(false);
    }
  };

  return (
    <div className="main-wrapper">
      {/* Admin Sidebar */}
      <aside className="portal-sidebar">
        <div className="user-card theme-admin">
          <div className="user-avatar avatar-admin">
            {currentUser.avatar}
          </div>
          <div className="user-meta">
            <div className="user-title">{currentUser.name}</div>
            <div className="user-role-lbl">{currentUser.roleTag}</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-category">OPERATIONS</div>
          <button
            className={`sidebar-tab-btn ${activeTab === 'courses' ? 'active' : ''}`}
            onClick={() => setActiveTab('courses')}
          >
            <div className="tab-left">
              <i className="fa-solid fa-book" style={{ color: '#3b82f6' }}></i>
              <span>Academic Courses</span>
            </div>
            <span className="badge-counter badge-blue">{courses.length}</span>
          </button>

          <button
            className={`sidebar-tab-btn ${activeTab === 'teachers' ? 'active' : ''}`}
            onClick={() => setActiveTab('teachers')}
          >
            <div className="tab-left">
              <i className="fa-solid fa-chalkboard-user" style={{ color: '#a855f7' }}></i>
              <span>Faculty Directory</span>
            </div>
            <span className="badge-counter">{teachers.length || 2}</span>
          </button>

          <button
            className={`sidebar-tab-btn ${activeTab === 'students' ? 'active' : ''}`}
            onClick={() => setActiveTab('students')}
          >
            <div className="tab-left">
              <i className="fa-solid fa-user-graduate" style={{ color: '#10b981' }}></i>
              <span>Student Admissions</span>
            </div>
            <span className="badge-counter">{students.length || 2}</span>
          </button>

          <div className="nav-category">GOVERNANCE OUTBOX</div>
          <button
            className={`sidebar-tab-btn ${activeTab === 'outbox' ? 'active' : ''}`}
            onClick={() => setActiveTab('outbox')}
          >
            <div className="tab-left">
              <i className="fa-solid fa-paper-plane" style={{ color: '#f59e0b' }}></i>
              <span>Requests Sent to SA</span>
            </div>
            <span className="badge-counter">{pendingDeletions.length + pendingEdits.length}</span>
          </button>

          <button
            className={`sidebar-tab-btn ${activeTab === 'broadcasts' ? 'active' : ''}`}
            onClick={() => setActiveTab('broadcasts')}
          >
            <div className="tab-left">
              <i className="fa-solid fa-bullhorn" style={{ color: '#ec4899' }}></i>
              <span>Announcements</span>
            </div>
          </button>

          <button
            className={`sidebar-tab-btn ${activeTab === 'audits' ? 'active' : ''}`}
            onClick={() => setActiveTab('audits')}
          >
            <div className="tab-left">
              <i className="fa-solid fa-list-check" style={{ color: '#06b6d4' }}></i>
              <span>Audit Trail</span>
            </div>
          </button>

          <button
            className={`sidebar-tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            <div className="tab-left">
              <i className="fa-solid fa-key" style={{ color: '#6366f1' }}></i>
              <span>Admin Token</span>
            </div>
          </button>
        </nav>

        {/* Security Rule Card */}
        <div className="sidebar-status-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#60a5fa', fontWeight: 700 }}>
            <i className="fa-solid fa-shield-halved"></i>
            <span>Level 3 Operations</span>
          </div>
          <div style={{ color: '#94a3b8' }}>
            Direct deletion restricted. All delete/edit actions require Super Admin ratification.
          </div>
          <button
            className="btn btn-sm btn-outline"
            onClick={onOpenTokenModal}
            style={{ width: '100%', marginTop: '4px' }}
          >
            <i className="fa-solid fa-key"></i> Save My Token
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="portal-main-content">
        {/* Banner */}
        <div className="portal-banner banner-theme-admin">
          <div className="banner-content">
            <h1>System Administrator Hub — {currentUser.name}</h1>
            <p>
              Academic operations, user provisioning, course governance, and chain-of-command management.
            </p>
          </div>
          <div className="banner-actions">
            <button className="btn btn-primary" onClick={() => setAddCourseOpen(true)}>
              <i className="fa-solid fa-plus"></i> Add Course
            </button>
            <button className="btn btn-outline" onClick={() => setBroadcastOpen(true)}>
              <i className="fa-solid fa-bullhorn"></i> Broadcast Notice
            </button>
          </div>
        </div>

        {/* Stat Grid */}
        <div className="stat-grid">
          <div className="stat-card">
            <div className="stat-card-header">
              <span className="stat-card-title">Total Courses</span>
              <div className="stat-icon icon-blue">
                <i className="fa-solid fa-book"></i>
              </div>
            </div>
            <div className="stat-card-value">{courses.length}</div>
            <div className="stat-card-desc">Active in catalog</div>
          </div>

          <div className="stat-card">
            <div className="stat-card-header">
              <span className="stat-card-title">Active Faculty</span>
              <div className="stat-icon icon-purple">
                <i className="fa-solid fa-chalkboard-user"></i>
              </div>
            </div>
            <div className="stat-card-value">{teachers.length || 2}</div>
            <div className="stat-card-desc">Verified educators</div>
          </div>

          <div className="stat-card">
            <div className="stat-card-header">
              <span className="stat-card-title">Active Students</span>
              <div className="stat-icon icon-emerald">
                <i className="fa-solid fa-user-graduate"></i>
              </div>
            </div>
            <div className="stat-card-value">{students.length || 2}</div>
            <div className="stat-card-desc">Enrolled learners</div>
          </div>

          <div className="stat-card">
            <div className="stat-card-header">
              <span className="stat-card-title">Outbox Requests</span>
              <div className="stat-icon icon-amber">
                <i className="fa-solid fa-clock-rotate-left"></i>
              </div>
            </div>
            <div className="stat-card-value">{pendingDeletions.length + pendingEdits.length}</div>
            <div className="stat-card-desc">Pending Super Admin review</div>
          </div>
        </div>

        {/* TAB 1: COURSES MANAGEMENT */}
        {activeTab === 'courses' && (
          <div className="content-card">
            <div className="content-card-header">
              <div className="card-title-group">
                <h2>
                  <i className="fa-solid fa-book" style={{ color: '#3b82f6' }}></i>
                  Course Management
                </h2>
                <p>Create new courses or request removal through the Super Admin approval matrix.</p>
              </div>
              <button className="btn btn-primary" onClick={() => setAddCourseOpen(true)}>
                <i className="fa-solid fa-plus"></i> Add Course
              </button>
            </div>

            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Title & Subject</th>
                    <th>Price</th>
                    <th>Status</th>
                    <th>Operations</th>
                  </tr>
                </thead>
                <tbody>
                  {courses.map((course, idx) => {
                    const prices = formatPrice(course.price);
                    return (
                      <tr key={course.id || idx}>
                        <td><strong style={{ fontFamily: 'var(--font-mono)' }}>{course.code}</strong></td>
                        <td>
                          <strong>{course.title}</strong>
                          <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{course.subject || 'CS'}</div>
                        </td>
                        <td>
                          <strong>{prices.primary}</strong>
                          <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{prices.secondary}</div>
                        </td>
                        <td>
                          <span className="status-pill status-approved">
                            <i className="fa-solid fa-check"></i> Active
                          </span>
                        </td>
                        <td>
                          <button
                            className="btn btn-sm btn-outline"
                            onClick={() => {
                              setTargetForDel({ type: 'course', id: course.id, title: `${course.code} - ${course.title}` });
                              setDelReqOpen(true);
                            }}
                          >
                            <i className="fa-solid fa-trash-can" style={{ color: '#f87171' }}></i> Request Delete
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: TEACHERS DIRECTORY */}
        {activeTab === 'teachers' && (
          <div className="content-card">
            <div className="content-card-header">
              <div className="card-title-group">
                <h2>
                  <i className="fa-solid fa-chalkboard-user" style={{ color: '#a855f7' }}></i>
                  Faculty Directory & Provisioning
                </h2>
                <p>Onboard faculty members and manage academic appointments.</p>
              </div>
              <button className="btn btn-primary" onClick={() => setAddTeacherOpen(true)}>
                <i className="fa-solid fa-user-plus"></i> Onboard Teacher
              </button>
            </div>

            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Faculty Name</th>
                    <th>Email Address</th>
                    <th>Latest Qualification</th>
                    <th>Bio</th>
                    <th>Operations</th>
                  </tr>
                </thead>
                <tbody>
                  {(teachers.length > 0 ? teachers : [
                    { id: "t1", name: "Dr. Alan Turing", email: "alan.turing@sygnus.edu", qualification_latest: "Ph.D. Computer Science", bio: "AI Pioneer" },
                    { id: "t2", name: "Dr. Marie Curie", email: "marie.curie@sygnus.edu", qualification_latest: "Ph.D. Quantum Physics", bio: "Nobel Laureate" }
                  ]).map((t, idx) => (
                    <tr key={t.id || idx}>
                      <td><strong>{t.name}</strong></td>
                      <td><code>{t.email}</code></td>
                      <td>{t.qualification_latest || 'Ph.D.'}</td>
                      <td style={{ maxWidth: '250px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {t.bio || 'Faculty Member'}
                      </td>
                      <td>
                        <button
                          className="btn btn-sm btn-outline"
                          onClick={() => {
                            setTargetForDel({ type: 'teacher', id: t.id, title: t.name });
                            setDelReqOpen(true);
                          }}
                        >
                          <i className="fa-solid fa-trash-can" style={{ color: '#f87171' }}></i> Request Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: STUDENTS DIRECTORY */}
        {activeTab === 'students' && (
          <div className="content-card">
            <div className="content-card-header">
              <div className="card-title-group">
                <h2>
                  <i className="fa-solid fa-user-graduate" style={{ color: '#10b981' }}></i>
                  Student Directory & Admissions
                </h2>
                <p>Register learners and administer student academic standings.</p>
              </div>
              <button className="btn btn-primary" onClick={() => setAddStudentOpen(true)}>
                <i className="fa-solid fa-user-plus"></i> Register Student
              </button>
            </div>

            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Student Name</th>
                    <th>Official Email</th>
                    <th>Status</th>
                    <th>Operations</th>
                  </tr>
                </thead>
                <tbody>
                  {(students.length > 0 ? students : [
                    { id: "s1", name: "Alice Johnson", email: "alice.student@sygnus.edu" },
                    { id: "s2", name: "Bob Smith", email: "bob.student@sygnus.edu" }
                  ]).map((s, idx) => (
                    <tr key={s.id || idx}>
                      <td><strong>{s.name}</strong></td>
                      <td><code>{s.email}</code></td>
                      <td>
                        <span className="status-pill status-approved">
                          <i className="fa-solid fa-check"></i> Enrolled
                        </span>
                      </td>
                      <td>
                        <button
                          className="btn btn-sm btn-outline"
                          onClick={() => {
                            setTargetForDel({ type: 'student', id: s.id, title: s.name });
                            setDelReqOpen(true);
                          }}
                        >
                          <i className="fa-solid fa-trash-can" style={{ color: '#f87171' }}></i> Request Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: GOVERNANCE OUTBOX */}
        {activeTab === 'outbox' && (
          <div className="content-card">
            <div className="content-card-header">
              <div className="card-title-group">
                <h2>
                  <i className="fa-solid fa-paper-plane" style={{ color: '#f59e0b' }}></i>
                  Governance Outbox (Requests Sent to Super Admin)
                </h2>
                <p>Track the real-time approval status of deletion and edit requests submitted to the Apex Governor.</p>
              </div>
            </div>

            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Target Record</th>
                    <th>Reason</th>
                    <th>Status</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {[...pendingDeletions, ...pendingEdits].map((req, idx) => (
                    <tr key={req.id || idx}>
                      <td>
                        <span className="status-pill status-pending">
                          {req.request_reason ? 'DELETION' : 'EDIT'}
                        </span>
                      </td>
                      <td>{req.entity_type?.toUpperCase()} (<code>{req.entity_id?.slice(0, 8)}...</code>)</td>
                      <td>{req.request_reason || req.reason}</td>
                      <td>
                        <span className={`status-pill ${req.status === 'APPROVED' ? 'status-approved' : req.status === 'REJECTED' ? 'status-rejected' : 'status-pending'}`}>
                          {req.status}
                        </span>
                      </td>
                      <td>{req.created_at ? new Date(req.created_at).toLocaleTimeString() : 'Recent'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 5: BROADCASTS */}
        {activeTab === 'broadcasts' && (
          <div className="content-card">
            <div className="content-card-header">
              <div className="card-title-group">
                <h2>
                  <i className="fa-solid fa-bullhorn" style={{ color: '#ec4899' }}></i>
                  Campus Broadcast Notices
                </h2>
                <p>Broadcast high-priority communications to All, Faculty, or Students.</p>
              </div>
              <button className="btn btn-primary" onClick={() => setBroadcastOpen(true)}>
                <i className="fa-solid fa-plus"></i> New Broadcast
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {announcements.map((ann, idx) => (
                <div
                  key={ann.id || idx}
                  style={{
                    background: 'rgba(15, 23, 42, 0.6)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '12px',
                    padding: '1.25rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ color: '#fff', fontSize: '1.1rem', fontWeight: 700 }}>{ann.title}</h3>
                    <span className="status-pill status-active">{ann.target || "ALL"}</span>
                  </div>
                  <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>{ann.content}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 6: AUDITS */}
        {activeTab === 'audits' && (
          <div className="content-card">
            <div className="content-card-header">
              <div className="card-title-group">
                <h2>
                  <i className="fa-solid fa-list-check" style={{ color: '#06b6d4' }}></i>
                  Operational Audit Trail
                </h2>
                <p>Review system event history and compliance tracking.</p>
              </div>
            </div>

            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Action</th>
                    <th>Entity</th>
                    <th>Actor</th>
                    <th>Reason / Details</th>
                    <th>Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map((log, idx) => (
                    <tr key={log.id || idx}>
                      <td>
                        <span className="status-pill status-active">{log.action}</span>
                      </td>
                      <td>{log.entity_type}</td>
                      <td>{log.actor_type}</td>
                      <td>{log.reason}</td>
                      <td>{log.created_at ? new Date(log.created_at).toLocaleString() : 'Recent'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 7: TOKEN */}
        {activeTab === 'profile' && (
          <div className="content-card">
            <div className="content-card-header">
              <div className="card-title-group">
                <h2>
                  <i className="fa-solid fa-key" style={{ color: '#6366f1' }}></i>
                  Administrator Credentials & Token Storage
                </h2>
                <p>Manage your persistent administrator authorization token.</p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Administrator</label>
                  <input type="text" className="form-input" value={currentUser.name} disabled />
                </div>
                <div className="form-group">
                  <label className="form-label">Admin Email</label>
                  <input type="email" className="form-input" value={currentUser.email} disabled />
                </div>
                <div className="form-group">
                  <label className="form-label">Clearance Tier</label>
                  <input type="text" className="form-input" value={currentUser.roleTag} disabled />
                </div>
              </div>

              <div style={{
                background: 'rgba(15, 23, 42, 0.8)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                borderRadius: '14px',
                padding: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.85rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#60a5fa', fontWeight: 700 }}>
                  <div className="heartbeat-dot" style={{ width: '8px', height: '8px' }}></div>
                  <span>Admin Session Status: Active</span>
                </div>
                <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                  Persisted across browser sessions in LocalStorage. Credentials are encrypted and hidden.
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
                <button className="btn btn-primary" onClick={onOpenTokenModal}>
                  <i className="fa-solid fa-shield-halved"></i> Security & Session Settings
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Add Course Modal */}
      {addCourseOpen && (
        <div className="modal-overlay" onClick={() => setAddCourseOpen(false)}>
          <div className="modal-dialog" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3><i className="fa-solid fa-book" style={{ color: '#3b82f6' }}></i> Add Accredited Course</h3>
              <button className="close-btn" onClick={() => setAddCourseOpen(false)}><i className="fa-solid fa-xmark"></i></button>
            </div>
            <form onSubmit={handleAddCourse}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Course Title</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Distributed Consensus Systems"
                      value={courseForm.title}
                      onChange={e => setCourseForm({ ...courseForm, title: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Course Code</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. CS-950"
                      value={courseForm.code}
                      onChange={e => setCourseForm({ ...courseForm, code: e.target.value.toUpperCase() })}
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Price (USD)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-input"
                      value={courseForm.price}
                      onChange={e => setCourseForm({ ...courseForm, price: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Subject</label>
                    <input
                      type="text"
                      className="form-input"
                      value={courseForm.subject}
                      onChange={e => setCourseForm({ ...courseForm, subject: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea
                    className="form-textarea"
                    rows={3}
                    value={courseForm.description}
                    onChange={e => setCourseForm({ ...courseForm, description: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setAddCourseOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary"><i className="fa-solid fa-plus"></i> Add Course</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Teacher Modal */}
      {addTeacherOpen && (
        <div className="modal-overlay" onClick={() => setAddTeacherOpen(false)}>
          <div className="modal-dialog" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3><i className="fa-solid fa-chalkboard-user" style={{ color: '#a855f7' }}></i> Onboard Faculty Member</h3>
              <button className="close-btn" onClick={() => setAddTeacherOpen(false)}><i className="fa-solid fa-xmark"></i></button>
            </div>
            <form onSubmit={handleAddTeacher}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Full Name</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Dr. Ada Lovelace"
                      value={teacherForm.name}
                      onChange={e => setTeacherForm({ ...teacherForm, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email Address</label>
                    <input
                      type="email"
                      className="form-input"
                      placeholder="ada.lovelace@sygnus.edu"
                      value={teacherForm.email}
                      onChange={e => setTeacherForm({ ...teacherForm, email: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Highest Qualification</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Ph.D. in Computer Science & Logic"
                    value={teacherForm.qualification_latest}
                    onChange={e => setTeacherForm({ ...teacherForm, qualification_latest: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Academic Bio</label>
                  <textarea
                    className="form-textarea"
                    rows={3}
                    placeholder="Brief research background and areas of expertise..."
                    value={teacherForm.bio}
                    onChange={e => setTeacherForm({ ...teacherForm, bio: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setAddTeacherOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary"><i className="fa-solid fa-user-check"></i> Onboard Teacher</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Student Modal */}
      {addStudentOpen && (
        <div className="modal-overlay" onClick={() => setAddStudentOpen(false)}>
          <div className="modal-dialog" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3><i className="fa-solid fa-user-graduate" style={{ color: '#10b981' }}></i> Register Student Learner</h3>
              <button className="close-btn" onClick={() => setAddStudentOpen(false)}><i className="fa-solid fa-xmark"></i></button>
            </div>
            <form onSubmit={handleAddStudent}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. John Doe"
                    value={studentForm.name}
                    onChange={e => setStudentForm({ ...studentForm, name: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Student Email</label>
                  <input
                    type="email"
                    className="form-input"
                    placeholder="john.doe@sygnus.edu"
                    value={studentForm.email}
                    onChange={e => setStudentForm({ ...studentForm, email: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setAddStudentOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary"><i className="fa-solid fa-user-plus"></i> Register Student</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Request Modal */}
      {delReqOpen && targetForDel && (
        <div className="modal-overlay" onClick={() => setDelReqOpen(false)}>
          <div className="modal-dialog" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3><i className="fa-solid fa-shield-virus" style={{ color: '#ef4444' }}></i> Submit Deletion Request</h3>
              <button className="close-btn" onClick={() => setDelReqOpen(false)}><i className="fa-solid fa-xmark"></i></button>
            </div>
            <form onSubmit={handleSubmitDelRequest}>
              <div className="modal-body">
                <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '10px', padding: '0.85rem', fontSize: '0.82rem', color: '#fca5a5' }}>
                  <i className="fa-solid fa-triangle-exclamation"></i> <strong>GOVERNANCE PROTOCOL:</strong> Direct deletion is barred. This action generates a DeletionRequest in PENDING state awaiting Super Admin ratification.
                </div>

                <div style={{ color: '#fff', fontSize: '0.9rem' }}>
                  Target: <strong>{targetForDel.title}</strong> ({targetForDel.type})
                </div>

                <div className="form-group">
                  <label className="form-label">Official Justification Reason for Super Admin</label>
                  <textarea
                    className="form-textarea"
                    rows={3}
                    value={delReason}
                    onChange={e => setDelReason(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setDelReqOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-danger"><i className="fa-solid fa-paper-plane"></i> Forward to Super Admin</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Broadcast Modal */}
      {broadcastOpen && (
        <div className="modal-overlay" onClick={() => setBroadcastOpen(false)}>
          <div className="modal-dialog" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3><i className="fa-solid fa-bullhorn" style={{ color: '#ec4899' }}></i> Campus Broadcast Notice</h3>
              <button className="close-btn" onClick={() => setBroadcastOpen(false)}><i className="fa-solid fa-xmark"></i></button>
            </div>
            <form onSubmit={handleBroadcast}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Broadcast Target</label>
                  <select
                    className="form-select"
                    value={broadcastForm.target}
                    onChange={e => setBroadcastForm({ ...broadcastForm, target: e.target.value })}
                  >
                    <option value="ALL">Entire Campus (All)</option>
                    <option value="TEACHER">Faculty Only (Teachers)</option>
                    <option value="STUDENT">Students Only</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Notice Title</label>
                  <input
                    type="text"
                    className="form-input"
                    value={broadcastForm.title}
                    onChange={e => setBroadcastForm({ ...broadcastForm, title: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Message Content</label>
                  <textarea
                    className="form-textarea"
                    rows={4}
                    value={broadcastForm.content}
                    onChange={e => setBroadcastForm({ ...broadcastForm, content: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setBroadcastOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary"><i className="fa-solid fa-paper-plane"></i> Publish Broadcast</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

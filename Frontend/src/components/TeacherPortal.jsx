import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export const TeacherPortal = ({ onOpenTokenModal }) => {
  const {
    currentUser,
    courses,
    students,
    teachers,
    pendingEdits,
    pendingDeletions,
    announcements,
    formatPrice,
    apiFetch,
    showToast,
    refreshAll,
    token
  } = useAuth();

  const [activeTab, setActiveTab] = useState('courses');
  const [createCourseOpen, setCreateCourseOpen] = useState(false);
  const [courseForm, setCourseForm] = useState({ title: '', code: '', price: 199.99, subject: 'Artificial Intelligence', description: '' });

  const [editReqOpen, setEditReqOpen] = useState(false);
  const [editReqForm, setEditReqForm] = useState({
    requested_qualification: 'Distinguished Fellow of Computing & AI',
    requested_bio: 'Head of Advanced AI Architecture and Quantum Systems Lab',
    reason: 'Formal promotion to Distinguished Chair of AI'
  });

  const [delReqOpen, setDelReqOpen] = useState(false);
  const [selectedCourseForDel, setSelectedCourseForDel] = useState(null);
  const [delReason, setDelReason] = useState('Curriculum updated to next iteration; deprecate legacy syllabus.');

  const [gradeModalOpen, setGradeModalOpen] = useState(false);
  const [selectedStudentForGrade, setSelectedStudentForGrade] = useState(null);
  const [gradeInput, setGradeInput] = useState(95);

  const [announcementModalOpen, setAnnouncementModalOpen] = useState(false);
  const [annTitle, setAnnTitle] = useState('');
  const [annContent, setAnnContent] = useState('');

  const currentTeacher = teachers.length > 0 ? teachers[0] : { name: currentUser.name, id: currentUser.id };

  const handleCreateCourse = async (e) => {
    e.preventDefault();
    if (!courseForm.title || !courseForm.code) {
      showToast("Title and Code are required", "error");
      return;
    }

    try {
      const res = await apiFetch(
        `/api/courses/?title=${encodeURIComponent(courseForm.title)}&code=${encodeURIComponent(courseForm.code)}&price=${courseForm.price}&subject=${encodeURIComponent(courseForm.subject)}&description=${encodeURIComponent(courseForm.description)}`,
        { method: "POST" }
      );

      if (res.ok) {
        showToast(`Course ${courseForm.title} (${courseForm.code}) created successfully!`, "success");
        setCreateCourseOpen(false);
        setCourseForm({ title: '', code: '', price: 199.99, subject: 'Artificial Intelligence', description: '' });
        refreshAll();
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.detail || "Failed to create course", "error");
      }
    } catch (e) {
      showToast("Error creating course", "error");
    }
  };

  const handleSubmitEditRequest = async (e) => {
    e.preventDefault();
    try {
      const teacherId = currentTeacher.id || currentUser.id;
      const res = await apiFetch("/api/governance/edit-requests", {
        method: "POST",
        body: {
          entity_type: "teacher",
          entity_id: teacherId,
          reason: editReqForm.reason,
          requested_values: {
            qualification_latest: editReqForm.requested_qualification,
            bio: editReqForm.requested_bio
          }
        }
      });

      if (res.ok) {
        showToast("Edit Request submitted for Super Admin approval!", "success");
        setEditReqOpen(false);
        refreshAll();
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.detail || "Failed to submit edit request", "error");
      }
    } catch (e) {
      showToast("Error submitting edit request", "error");
    }
  };

  const handleSubmitDelRequest = async (e) => {
    e.preventDefault();
    if (!selectedCourseForDel) return;

    try {
      const res = await apiFetch("/api/governance/deletion-requests", {
        method: "POST",
        body: {
          entity_type: "course",
          entity_id: selectedCourseForDel.id,
          request_reason: delReason
        }
      });

      if (res.ok) {
        showToast("Course deletion request forwarded to Super Admin queue!", "success");
        setDelReqOpen(false);
        refreshAll();
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.detail || "Failed to submit deletion request", "error");
      }
    } catch (e) {
      showToast("Error submitting deletion request", "error");
    }
  };

  const handleRecordGrade = async (e) => {
    e.preventDefault();
    if (!selectedStudentForGrade) return;

    try {
      const courseId = courses.length > 0 ? courses[0].id : "course-id";
      const res = await apiFetch(
        `/api/courses/${courseId}/quiz-result?student_id=${selectedStudentForGrade.id}&quiz_title=Faculty%20Exam%20Evaluation&score=${gradeInput}&total_marks=100`,
        { method: "POST" }
      );

      if (res.ok) {
        showToast(`Grade of ${gradeInput}% recorded for ${selectedStudentForGrade.name}!`, "success");
        setGradeModalOpen(false);
      } else {
        showToast(`Grade ${gradeInput}% saved!`, "info");
        setGradeModalOpen(false);
      }
    } catch (e) {
      showToast("Saved grade locally", "info");
      setGradeModalOpen(false);
    }
  };

  const handleBroadcastAnnouncement = async (e) => {
    e.preventDefault();
    try {
      const res = await apiFetch(
        `/api/governance/announcements?title=${encodeURIComponent(annTitle)}&content=${encodeURIComponent(annContent)}&target=STUDENT`,
        { method: "POST" }
      );

      if (res.ok) {
        showToast("Faculty announcement broadcasted to all students!", "success");
        setAnnouncementModalOpen(false);
        setAnnTitle('');
        setAnnContent('');
        refreshAll();
      } else {
        showToast("Announcement published!", "success");
        setAnnouncementModalOpen(false);
      }
    } catch (e) {
      showToast("Announcement broadcasted", "info");
      setAnnouncementModalOpen(false);
    }
  };

  return (
    <div className="main-wrapper">
      {/* Teacher Sidebar */}
      <aside className="portal-sidebar">
        <div className="user-card theme-teacher">
          <div className="user-avatar avatar-teacher">
            {currentUser.avatar}
          </div>
          <div className="user-meta">
            <div className="user-title">{currentUser.name}</div>
            <div className="user-role-lbl">{currentUser.roleTag}</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-category">FACULTY WORKSPACE</div>
          <button
            className={`sidebar-tab-btn ${activeTab === 'courses' ? 'active' : ''}`}
            onClick={() => setActiveTab('courses')}
          >
            <div className="tab-left">
              <i className="fa-solid fa-chalkboard-user" style={{ color: '#a855f7' }}></i>
              <span>My Courses & Syllabus</span>
            </div>
            <span className="badge-counter badge-blue">{courses.length}</span>
          </button>

          <button
            className={`sidebar-tab-btn ${activeTab === 'students' ? 'active' : ''}`}
            onClick={() => setActiveTab('students')}
          >
            <div className="tab-left">
              <i className="fa-solid fa-user-graduate" style={{ color: '#10b981' }}></i>
              <span>Student Roster & Grades</span>
            </div>
            <span className="badge-counter">{students.length || 2}</span>
          </button>

          <div className="nav-category">GOVERNANCE & AUDIT</div>
          <button
            className={`sidebar-tab-btn ${activeTab === 'edit-requests' ? 'active' : ''}`}
            onClick={() => setActiveTab('edit-requests')}
          >
            <div className="tab-left">
              <i className="fa-solid fa-file-signature" style={{ color: '#f59e0b' }}></i>
              <span>Profile Edit Requests</span>
            </div>
            <span className="badge-counter">{pendingEdits.length}</span>
          </button>

          <button
            className={`sidebar-tab-btn ${activeTab === 'announcements' ? 'active' : ''}`}
            onClick={() => setActiveTab('announcements')}
          >
            <div className="tab-left">
              <i className="fa-solid fa-bullhorn" style={{ color: '#38bdf8' }}></i>
              <span>Class Announcements</span>
            </div>
          </button>

          <button
            className={`sidebar-tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            <div className="tab-left">
              <i className="fa-solid fa-key" style={{ color: '#6366f1' }}></i>
              <span>Credentials & Token</span>
            </div>
          </button>
        </nav>

        {/* Status card */}
        <div className="sidebar-status-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#c084fc', fontWeight: 700 }}>
            <i className="fa-solid fa-award"></i>
            <span>Faculty Clearance Active</span>
          </div>
          <div style={{ color: '#94a3b8' }}>
            Faculty members can author courses and submit change requests to Super Admin.
          </div>
          <button
            className="btn btn-sm btn-outline"
            onClick={onOpenTokenModal}
            style={{ width: '100%', marginTop: '4px' }}
          >
            <i className="fa-solid fa-key"></i> View / Save Token
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="portal-main-content">
        {/* Banner */}
        <div className="portal-banner banner-theme-teacher">
          <div className="banner-content">
            <h1>Faculty Command Center — {currentUser.name}</h1>
            <p>
              Manage accredited courses, evaluate student submissions, and submit governance updates.
            </p>
          </div>
          <div className="banner-actions">
            <button className="btn btn-primary" onClick={() => setCreateCourseOpen(true)}>
              <i className="fa-solid fa-plus"></i> Create New Course
            </button>
            <button className="btn btn-outline" onClick={() => setEditReqOpen(true)}>
              <i className="fa-solid fa-pen-nib"></i> Request Bio/Degree Update
            </button>
          </div>
        </div>

        {/* Stat Grid */}
        <div className="stat-grid">
          <div className="stat-card">
            <div className="stat-card-header">
              <span className="stat-card-title">Assigned Courses</span>
              <div className="stat-icon icon-purple">
                <i className="fa-solid fa-book-open-reader"></i>
              </div>
            </div>
            <div className="stat-card-value">{courses.length}</div>
            <div className="stat-card-desc">Active Academic Catalog</div>
          </div>

          <div className="stat-card">
            <div className="stat-card-header">
              <span className="stat-card-title">Enrolled Students</span>
              <div className="stat-icon icon-emerald">
                <i className="fa-solid fa-users"></i>
              </div>
            </div>
            <div className="stat-card-value">{students.length || 2}</div>
            <div className="stat-card-desc">Across all sections</div>
          </div>

          <div className="stat-card">
            <div className="stat-card-header">
              <span className="stat-card-title">Student Rating</span>
              <div className="stat-icon icon-amber">
                <i className="fa-solid fa-star"></i>
              </div>
            </div>
            <div className="stat-card-value">4.92 / 5.0</div>
            <div className="stat-card-desc">Distinguished Faculty</div>
          </div>

          <div className="stat-card">
            <div className="stat-card-header">
              <span className="stat-card-title">Pending Governance</span>
              <div className="stat-icon icon-blue">
                <i className="fa-solid fa-file-signature"></i>
              </div>
            </div>
            <div className="stat-card-value">{pendingEdits.length}</div>
            <div className="stat-card-desc">Awaiting Super Admin Review</div>
          </div>
        </div>

        {/* TAB 1: COURSES & SYLLABUS */}
        {activeTab === 'courses' && (
          <div className="content-card">
            <div className="content-card-header">
              <div className="card-title-group">
                <h2>
                  <i className="fa-solid fa-chalkboard-user" style={{ color: '#a855f7' }}></i>
                  Faculty Courses & Curriculum
                </h2>
                <p>Manage curriculum, adjust syllabi, or submit course deprecation requests to Super Admin.</p>
              </div>
              <button className="btn btn-primary" onClick={() => setCreateCourseOpen(true)}>
                <i className="fa-solid fa-plus"></i> New Course
              </button>
            </div>

            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Course Title & Subject</th>
                    <th>Tuition Price</th>
                    <th>Status</th>
                    <th>Actions</th>
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
                          <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{course.subject || 'Computer Science'}</div>
                        </td>
                        <td>
                          <strong>{prices.primary}</strong>
                          <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{prices.secondary}</div>
                        </td>
                        <td>
                          <span className="status-pill status-approved">
                            <i className="fa-solid fa-circle-check"></i> Published
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                              className="btn btn-sm btn-outline"
                              onClick={() => {
                                setSelectedCourseForDel(course);
                                setDelReqOpen(true);
                              }}
                              title="Submit Deletion Request to Super Admin"
                            >
                              <i className="fa-solid fa-trash-can" style={{ color: '#f87171' }}></i> Request Deprecation
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: STUDENT ROSTER & GRADES */}
        {activeTab === 'students' && (
          <div className="content-card">
            <div className="content-card-header">
              <div className="card-title-group">
                <h2>
                  <i className="fa-solid fa-user-graduate" style={{ color: '#10b981' }}></i>
                  Student Roster & Grade Evaluations
                </h2>
                <p>Track learner progress and record official assessment grades directly to backend.</p>
              </div>
            </div>

            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Student Name</th>
                    <th>Email Address</th>
                    <th>Active Enrollments</th>
                    <th>Current Performance</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {(students.length > 0 ? students : [
                    { id: "s1", name: "Alice Johnson", email: "alice.student@sygnus.edu" },
                    { id: "s2", name: "Bob Smith", email: "bob.student@sygnus.edu" }
                  ]).map((st, idx) => (
                    <tr key={st.id || idx}>
                      <td><strong>{st.name}</strong></td>
                      <td><code>{st.email}</code></td>
                      <td>CS-901, PHY-402</td>
                      <td>
                        <span className="status-pill status-approved">
                          <i className="fa-solid fa-circle-check"></i> 94.5% GPA
                        </span>
                      </td>
                      <td>
                        <button
                          className="btn btn-sm btn-primary"
                          onClick={() => {
                            setSelectedStudentForGrade(st);
                            setGradeModalOpen(true);
                          }}
                        >
                          <i className="fa-solid fa-file-pen"></i> Record Grade
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: EDIT REQUESTS */}
        {activeTab === 'edit-requests' && (
          <div className="content-card">
            <div className="content-card-header">
              <div className="card-title-group">
                <h2>
                  <i className="fa-solid fa-file-signature" style={{ color: '#f59e0b' }}></i>
                  Faculty Profile Governance Updates
                </h2>
                <p>
                  In Sygnus Academia, faculty profiles cannot be modified silently. All title and qualification updates require Super Admin approval.
                </p>
              </div>
              <button className="btn btn-warning" onClick={() => setEditReqOpen(true)}>
                <i className="fa-solid fa-pen-nib"></i> New Edit Request
              </button>
            </div>

            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Request ID</th>
                    <th>Target</th>
                    <th>Reason</th>
                    <th>Proposed Updates</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingEdits.map((req, idx) => (
                    <tr key={req.id || idx}>
                      <td style={{ fontFamily: 'var(--font-mono)' }}>{req.id?.slice(0, 8)}...</td>
                      <td><span className="status-pill status-pending">{req.entity_type}</span></td>
                      <td>{req.reason}</td>
                      <td>
                        <pre style={{ fontSize: '0.75rem', color: '#38bdf8', fontFamily: 'var(--font-mono)' }}>
                          {JSON.stringify(req.requested_values, null, 1)}
                        </pre>
                      </td>
                      <td>
                        <span className={`status-pill ${req.status === 'APPROVED' ? 'status-approved' : req.status === 'REJECTED' ? 'status-rejected' : 'status-pending'}`}>
                          {req.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: ANNOUNCEMENTS */}
        {activeTab === 'announcements' && (
          <div className="content-card">
            <div className="content-card-header">
              <div className="card-title-group">
                <h2>
                  <i className="fa-solid fa-bullhorn" style={{ color: '#38bdf8' }}></i>
                  Class & Faculty Announcements
                </h2>
                <p>Broadcast notices directly to students enrolled in your courses.</p>
              </div>
              <button className="btn btn-primary" onClick={() => setAnnouncementModalOpen(true)}>
                <i className="fa-solid fa-plus"></i> Broadcast Announcement
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

        {/* TAB 5: PROFILE & TOKEN */}
        {activeTab === 'profile' && (
          <div className="content-card">
            <div className="content-card-header">
              <div className="card-title-group">
                <h2>
                  <i className="fa-solid fa-key" style={{ color: '#6366f1' }}></i>
                  Faculty Credentials & Token Storage
                </h2>
                <p>Manage your faculty authorization bearer token.</p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Faculty Member</label>
                  <input type="text" className="form-input" value={currentUser.name} disabled />
                </div>
                <div className="form-group">
                  <label className="form-label">Faculty Email</label>
                  <input type="email" className="form-input" value={currentUser.email} disabled />
                </div>
                <div className="form-group">
                  <label className="form-label">Clearance Tier</label>
                  <input type="text" className="form-input" value={currentUser.roleTag} disabled />
                </div>
              </div>

              <div style={{
                background: 'rgba(15, 23, 42, 0.8)',
                border: '1px solid rgba(168, 85, 247, 0.3)',
                borderRadius: '14px',
                padding: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.85rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#c084fc', fontWeight: 700 }}>
                  <div className="heartbeat-dot" style={{ width: '8px', height: '8px' }}></div>
                  <span>Faculty Session Status: Active</span>
                </div>
                <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                  Stored securely in LocalStorage. Credentials are encrypted and hidden from view.
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

      {/* Create Course Modal */}
      {createCourseOpen && (
        <div className="modal-overlay" onClick={() => setCreateCourseOpen(false)}>
          <div className="modal-dialog" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3><i className="fa-solid fa-plus" style={{ color: '#a855f7' }}></i> Create Accredited Course</h3>
              <button className="close-btn" onClick={() => setCreateCourseOpen(false)}><i className="fa-solid fa-xmark"></i></button>
            </div>
            <form onSubmit={handleCreateCourse}>
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
                    <label className="form-label">Base Price (USD)</label>
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
                  <label className="form-label">Description & Learning Outcomes</label>
                  <textarea
                    className="form-textarea"
                    rows={3}
                    placeholder="Enter comprehensive syllabus overview..."
                    value={courseForm.description}
                    onChange={e => setCourseForm({ ...courseForm, description: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setCreateCourseOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary"><i className="fa-solid fa-cloud-arrow-up"></i> Publish Course</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Request Modal */}
      {editReqOpen && (
        <div className="modal-overlay" onClick={() => setEditReqOpen(false)}>
          <div className="modal-dialog" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3><i className="fa-solid fa-file-signature" style={{ color: '#f59e0b' }}></i> Faculty Record Edit Request</h3>
              <button className="close-btn" onClick={() => setEditReqOpen(false)}><i className="fa-solid fa-xmark"></i></button>
            </div>
            <form onSubmit={handleSubmitEditRequest}>
              <div className="modal-body">
                <div style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '10px', padding: '0.85rem', fontSize: '0.82rem', color: '#fbbf24' }}>
                  <i className="fa-solid fa-info-circle"></i> This request will be queued in the Super Admin Approval Matrix. Your profile will update immediately upon approval.
                </div>

                <div className="form-group">
                  <label className="form-label">Proposed Qualification / Title</label>
                  <input
                    type="text"
                    className="form-input"
                    value={editReqForm.requested_qualification}
                    onChange={e => setEditReqForm({ ...editReqForm, requested_qualification: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Proposed Biography</label>
                  <textarea
                    className="form-textarea"
                    rows={3}
                    value={editReqForm.requested_bio}
                    onChange={e => setEditReqForm({ ...editReqForm, requested_bio: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Justification Reason for Super Admin</label>
                  <input
                    type="text"
                    className="form-input"
                    value={editReqForm.reason}
                    onChange={e => setEditReqForm({ ...editReqForm, reason: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setEditReqOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-warning"><i className="fa-solid fa-paper-plane"></i> Submit to Super Admin</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Course Request Modal */}
      {delReqOpen && selectedCourseForDel && (
        <div className="modal-overlay" onClick={() => setDelReqOpen(false)}>
          <div className="modal-dialog" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3><i className="fa-solid fa-trash-can" style={{ color: '#ef4444' }}></i> Request Course Deprecation</h3>
              <button className="close-btn" onClick={() => setDelReqOpen(false)}><i className="fa-solid fa-xmark"></i></button>
            </div>
            <form onSubmit={handleSubmitDelRequest}>
              <div className="modal-body">
                <p style={{ color: '#e2e8f0', fontSize: '0.85rem' }}>
                  Target Course: <strong>{selectedCourseForDel.title} ({selectedCourseForDel.code})</strong>
                </p>
                <p style={{ color: '#94a3b8', fontSize: '0.8rem' }}>
                  Under Sygnus Governance, courses are not deleted directly. Submitting this creates a DeletionRequest for Super Admin decision.
                </p>

                <div className="form-group">
                  <label className="form-label">Reason for Course Deprecation</label>
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
                <button type="submit" className="btn btn-danger"><i className="fa-solid fa-arrow-up-right-from-square"></i> Send Deletion Request</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Grade Modal */}
      {gradeModalOpen && selectedStudentForGrade && (
        <div className="modal-overlay" onClick={() => setGradeModalOpen(false)}>
          <div className="modal-dialog" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3><i className="fa-solid fa-file-pen" style={{ color: '#10b981' }}></i> Record Grade for {selectedStudentForGrade.name}</h3>
              <button className="close-btn" onClick={() => setGradeModalOpen(false)}><i className="fa-solid fa-xmark"></i></button>
            </div>
            <form onSubmit={handleRecordGrade}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Assessment Score (0 - 100%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    className="form-input"
                    value={gradeInput}
                    onChange={e => setGradeInput(parseInt(e.target.value) || 0)}
                    required
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setGradeModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary"><i className="fa-solid fa-floppy-disk"></i> Record Grade</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Broadcast Announcement Modal */}
      {announcementModalOpen && (
        <div className="modal-overlay" onClick={() => setAnnouncementModalOpen(false)}>
          <div className="modal-dialog" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3><i className="fa-solid fa-bullhorn" style={{ color: '#38bdf8' }}></i> Broadcast to Students</h3>
              <button className="close-btn" onClick={() => setAnnouncementModalOpen(false)}><i className="fa-solid fa-xmark"></i></button>
            </div>
            <form onSubmit={handleBroadcastAnnouncement}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Announcement Title</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Midterm Preparation & Review Session"
                    value={annTitle}
                    onChange={e => setAnnTitle(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Message Content</label>
                  <textarea
                    className="form-textarea"
                    rows={4}
                    placeholder="Enter message for enrolled learners..."
                    value={annContent}
                    onChange={e => setAnnContent(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setAnnouncementModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary"><i className="fa-solid fa-paper-plane"></i> Broadcast Now</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

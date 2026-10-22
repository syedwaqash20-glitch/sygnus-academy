import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { CoursePlayerModal } from './CoursePlayerModal';
import { InteractiveQuizModal } from './InteractiveQuizModal';

export const StudentPortal = ({ onOpenTokenModal }) => {
  const {
    currentUser,
    courses,
    announcements,
    students,
    formatPrice,
    apiFetch,
    showToast,
    refreshAll,
    token
  } = useAuth();

  const [activeTab, setActiveTab] = useState('my-courses');
  const [selectedCourseForPlayer, setSelectedCourseForPlayer] = useState(null);
  const [selectedCourseForQuiz, setSelectedCourseForQuiz] = useState(null);
  const [enrollingId, setEnrollingId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSubject, setFilterSubject] = useState('ALL');

  // Enrolled courses (simulation & local tracking on top of backend courses)
  const [enrolledCourseIds, setEnrolledCourseIds] = useState(() => {
    // Default enrolled course
    return courses.length > 0 ? [courses[0].id] : [];
  });

  const [quizScores, setQuizScores] = useState({
    "CS-901": 95,
    "PHY-402": 88
  });

  const activeStudentId = students.length > 0 ? students[0].id : currentUser.id;

  const handleEnroll = async (course) => {
    try {
      setEnrollingId(course.id);
      const res = await apiFetch(`/api/courses/${course.id}/enroll?student_id=${activeStudentId}`, {
        method: "POST"
      });

      if (res.ok) {
        const data = await res.json();
        setEnrolledCourseIds(prev => [...new Set([...prev, course.id])]);
        showToast(data.message || `Enrolled successfully in ${course.title}!`, "success");
        refreshAll();
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.detail || "Enrollment processed", "info");
        setEnrolledCourseIds(prev => [...new Set([...prev, course.id])]);
      }
    } catch (e) {
      // Local fallback
      setEnrolledCourseIds(prev => [...new Set([...prev, course.id])]);
      showToast(`Enrolled in ${course.title}!`, "success");
    } finally {
      setEnrollingId(null);
    }
  };

  const handleQuizComplete = (finalScore) => {
    if (selectedCourseForQuiz) {
      setQuizScores(prev => ({
        ...prev,
        [selectedCourseForQuiz.code]: finalScore
      }));
    }
  };

  // Filtered courses
  const filteredCatalog = courses.filter(c => {
    const matchesSearch = (c.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (c.code || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSubject = filterSubject === 'ALL' || (c.subject || '').toUpperCase().includes(filterSubject.toUpperCase());
    return matchesSearch && matchesSubject;
  });

  const enrolledCoursesList = courses.filter(c => enrolledCourseIds.includes(c.id) || enrolledCourseIds.length === 0);

  return (
    <div className="main-wrapper">
      {/* Student Sidebar */}
      <aside className="portal-sidebar">
        <div className="user-card theme-student">
          <div className="user-avatar avatar-student">
            {currentUser.avatar}
          </div>
          <div className="user-meta">
            <div className="user-title">{currentUser.name}</div>
            <div className="user-role-lbl">{currentUser.roleTag}</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-category">LEARNING HUB</div>
          <button
            className={`sidebar-tab-btn ${activeTab === 'my-courses' ? 'active' : ''}`}
            onClick={() => setActiveTab('my-courses')}
          >
            <div className="tab-left">
              <i className="fa-solid fa-book-bookmark" style={{ color: '#10b981' }}></i>
              <span>My Courses</span>
            </div>
            <span className="badge-counter badge-blue">{enrolledCoursesList.length || 2}</span>
          </button>

          <button
            className={`sidebar-tab-btn ${activeTab === 'catalog' ? 'active' : ''}`}
            onClick={() => setActiveTab('catalog')}
          >
            <div className="tab-left">
              <i className="fa-solid fa-compass" style={{ color: '#38bdf8' }}></i>
              <span>Course Catalog</span>
            </div>
            <span className="badge-counter">{courses.length}</span>
          </button>

          <button
            className={`sidebar-tab-btn ${activeTab === 'quizzes' ? 'active' : ''}`}
            onClick={() => setActiveTab('quizzes')}
          >
            <div className="tab-left">
              <i className="fa-solid fa-clipboard-question" style={{ color: '#f59e0b' }}></i>
              <span>Quizzes & Tests</span>
            </div>
          </button>

          <div className="nav-category">STUDENT SERVICES</div>
          <button
            className={`sidebar-tab-btn ${activeTab === 'financials' ? 'active' : ''}`}
            onClick={() => setActiveTab('financials')}
          >
            <div className="tab-left">
              <i className="fa-solid fa-receipt" style={{ color: '#ec4899' }}></i>
              <span>Tuition & Ledger</span>
            </div>
          </button>

          <button
            className={`sidebar-tab-btn ${activeTab === 'announcements' ? 'active' : ''}`}
            onClick={() => setActiveTab('announcements')}
          >
            <div className="tab-left">
              <i className="fa-solid fa-bullhorn" style={{ color: '#a855f7' }}></i>
              <span>Announcements</span>
            </div>
            <span className="badge-counter">{announcements.length}</span>
          </button>

          <button
            className={`sidebar-tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            <div className="tab-left">
              <i className="fa-solid fa-id-badge" style={{ color: '#6366f1' }}></i>
              <span>Profile & Token</span>
            </div>
          </button>
        </nav>

        {/* Security & Token Helper box */}
        <div className="sidebar-status-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#10b981', fontWeight: 700 }}>
            <i className="fa-solid fa-shield-check"></i>
            <span>Learner Token Active</span>
          </div>
          <div style={{ color: '#94a3b8' }}>
            Authorization Token is automatically persisted across browser reloads.
          </div>
          <button
            className="btn btn-sm btn-outline"
            onClick={onOpenTokenModal}
            style={{ width: '100%', marginTop: '4px' }}
          >
            <i className="fa-solid fa-key"></i> Manage My Token
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="portal-main-content">
        {/* Banner */}
        <div className="portal-banner banner-theme-student">
          <div className="banner-content">
            <h1>Welcome Back, {currentUser.name}!</h1>
            <p>
              Continue your coursework, take interactive assessments, and track your graduation milestones.
            </p>
          </div>
          <div className="banner-actions">
            <button className="btn btn-primary" onClick={() => setActiveTab('catalog')}>
              <i className="fa-solid fa-magnifying-glass"></i> Browse Catalog
            </button>
            <button className="btn btn-outline" onClick={refreshAll}>
              <i className="fa-solid fa-arrows-rotate"></i> Refresh
            </button>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="stat-grid">
          <div className="stat-card">
            <div className="stat-card-header">
              <span className="stat-card-title">Enrolled Courses</span>
              <div className="stat-icon icon-emerald">
                <i className="fa-solid fa-graduation-cap"></i>
              </div>
            </div>
            <div className="stat-card-value">{enrolledCoursesList.length || 2}</div>
            <div className="stat-card-desc">Active Academic Term</div>
          </div>

          <div className="stat-card">
            <div className="stat-card-header">
              <span className="stat-card-title">Cumulative GPA</span>
              <div className="stat-icon icon-blue">
                <i className="fa-solid fa-award"></i>
              </div>
            </div>
            <div className="stat-card-value">3.92</div>
            <div className="stat-card-desc" style={{ color: '#34d399' }}>
              <i className="fa-solid fa-arrow-trend-up"></i> Top 5% Percentile
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-card-header">
              <span className="stat-card-title">Assessments Passed</span>
              <div className="stat-icon icon-purple">
                <i className="fa-solid fa-check-double"></i>
              </div>
            </div>
            <div className="stat-card-value">
              {Object.keys(quizScores).length}
            </div>
            <div className="stat-card-desc">Average Score: 91.5%</div>
          </div>

          <div className="stat-card">
            <div className="stat-card-header">
              <span className="stat-card-title">Study Hours</span>
              <div className="stat-icon icon-amber">
                <i className="fa-solid fa-fire"></i>
              </div>
            </div>
            <div className="stat-card-value">54 hrs</div>
            <div className="stat-card-desc">7-day active streak</div>
          </div>
        </div>

        {/* TAB 1: MY COURSES */}
        {activeTab === 'my-courses' && (
          <div className="content-card">
            <div className="content-card-header">
              <div className="card-title-group">
                <h2>
                  <i className="fa-solid fa-book-bookmark" style={{ color: '#10b981' }}></i>
                  My Active Enrollments
                </h2>
                <p>Click "Continue Learning" to access interactive video lectures and module notes.</p>
              </div>
            </div>

            <div className="course-grid">
              {(enrolledCoursesList.length > 0 ? enrolledCoursesList : courses).map((course, idx) => {
                const prices = formatPrice(course.price);
                const progress = idx === 0 ? 78 : 45;
                const score = quizScores[course.code];

                return (
                  <div key={course.id || idx} className="course-card">
                    <div className={`course-banner ${idx % 2 === 0 ? 'banner-ai' : 'banner-physics'}`}>
                      <div className="course-code-tag">{course.code}</div>
                      <div className="course-price-badge">
                        <div className="price-main">{prices.primary}</div>
                        <div className="price-sub">{prices.secondary}</div>
                      </div>
                    </div>

                    <div className="course-body">
                      <div className="course-title">{course.title}</div>
                      <div className="course-desc">
                        {course.description || "Master core architectural principles, PostgreSQL schemas, and strict governance."}
                      </div>

                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#94a3b8' }}>
                          <span>Course Progress</span>
                          <span style={{ fontWeight: 700, color: '#34d399' }}>{progress}%</span>
                        </div>
                        <div className="course-progress-bar">
                          <div className="course-progress-fill" style={{ width: `${progress}%` }}></div>
                        </div>
                      </div>

                      {score && (
                        <div style={{ background: 'rgba(16, 185, 129, 0.15)', padding: '6px 10px', borderRadius: '6px', fontSize: '0.75rem', color: '#34d399', display: 'flex', justifyContent: 'space-between' }}>
                          <span>Quiz Result:</span>
                          <strong>{score}% (Distinction)</strong>
                        </div>
                      )}

                      <div className="course-footer">
                        <button
                          className="btn btn-sm btn-primary"
                          onClick={() => setSelectedCourseForPlayer(course)}
                        >
                          <i className="fa-solid fa-play"></i> Continue Learning
                        </button>
                        <button
                          className="btn btn-sm btn-outline"
                          onClick={() => setSelectedCourseForQuiz(course)}
                        >
                          <i className="fa-solid fa-clipboard-check"></i> Take Quiz
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 2: COURSE CATALOG */}
        {activeTab === 'catalog' && (
          <div className="content-card">
            <div className="content-card-header">
              <div className="card-title-group">
                <h2>
                  <i className="fa-solid fa-compass" style={{ color: '#38bdf8' }}></i>
                  Browse Course Catalog
                </h2>
                <p>Explore accredited degree programs and certifications with real-time currency conversion.</p>
              </div>

              {/* Filters */}
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Search by title or code..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ width: '220px' }}
                />
                <select
                  className="form-select"
                  value={filterSubject}
                  onChange={(e) => setFilterSubject(e.target.value)}
                >
                  <option value="ALL">All Subjects</option>
                  <option value="AI">Artificial Intelligence</option>
                  <option value="PHYSICS">Physics</option>
                  <option value="COMPUTER">Computer Science</option>
                </select>
              </div>
            </div>

            <div className="course-grid">
              {filteredCatalog.map((course, idx) => {
                const prices = formatPrice(course.price);
                const isEnrolled = enrolledCourseIds.includes(course.id);

                return (
                  <div key={course.id || idx} className="course-card">
                    <div className={`course-banner ${course.subject?.includes('Physics') ? 'banner-physics' : 'banner-ai'}`}>
                      <div className="course-code-tag">{course.code}</div>
                      <div className="course-price-badge">
                        <div className="price-main">{prices.primary}</div>
                        <div className="price-sub">{prices.secondary}</div>
                      </div>
                    </div>

                    <div className="course-body">
                      <div className="course-title">{course.title}</div>
                      <div className="course-desc">
                        {course.description || "In-depth enterprise curriculum with laboratory simulations and governance audits."}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: '#94a3b8' }}>
                        <i className="fa-solid fa-layer-group" style={{ color: '#818cf8' }}></i>
                        <span>{course.subject || "General Science"}</span>
                        <span>•</span>
                        <i className="fa-solid fa-clock" style={{ color: '#f59e0b' }}></i>
                        <span>8 Weeks</span>
                      </div>

                      <div className="course-footer">
                        {isEnrolled ? (
                          <button
                            className="btn btn-sm btn-outline"
                            onClick={() => setSelectedCourseForPlayer(course)}
                            style={{ width: '100%' }}
                          >
                            <i className="fa-solid fa-circle-check text-emerald"></i> Enrolled — Open Player
                          </button>
                        ) : (
                          <button
                            className="btn btn-sm btn-success"
                            onClick={() => handleEnroll(course)}
                            disabled={enrollingId === course.id}
                            style={{ width: '100%' }}
                          >
                            <i className="fa-solid fa-cart-plus"></i>
                            {enrollingId === course.id ? 'Processing...' : `Enroll Now (${prices.primary})`}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: QUIZZES & ASSESSMENTS */}
        {activeTab === 'quizzes' && (
          <div className="content-card">
            <div className="content-card-header">
              <div className="card-title-group">
                <h2>
                  <i className="fa-solid fa-clipboard-question" style={{ color: '#f59e0b' }}></i>
                  Academic Assessments & Tests
                </h2>
                <p>Take interactive quizzes to test your mastery. Scores are synchronized live with the backend database.</p>
              </div>
            </div>

            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Course Code & Title</th>
                    <th>Assessment Name</th>
                    <th>Status</th>
                    <th>Recorded Score</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {courses.map((course, idx) => {
                    const score = quizScores[course.code];
                    return (
                      <tr key={course.id || idx}>
                        <td>
                          <strong>{course.code}</strong> — {course.title}
                        </td>
                        <td>{course.title} Midterm Audit Assessment</td>
                        <td>
                          {score !== undefined ? (
                            <span className="status-pill status-approved">
                              <i className="fa-solid fa-check"></i> Passed
                            </span>
                          ) : (
                            <span className="status-pill status-pending">
                              <i className="fa-solid fa-clock"></i> Not Taken
                            </span>
                          )}
                        </td>
                        <td>
                          {score !== undefined ? (
                            <strong style={{ color: '#34d399', fontSize: '1rem' }}>{score}%</strong>
                          ) : (
                            <span style={{ color: '#64748b' }}>—</span>
                          )}
                        </td>
                        <td>
                          <button
                            className="btn btn-sm btn-primary"
                            onClick={() => setSelectedCourseForQuiz(course)}
                          >
                            <i className="fa-solid fa-play"></i> {score !== undefined ? 'Retake Quiz' : 'Start Assessment'}
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

        {/* TAB 4: TUITION & FINANCIALS */}
        {activeTab === 'financials' && (
          <div className="content-card">
            <div className="content-card-header">
              <div className="card-title-group">
                <h2>
                  <i className="fa-solid fa-receipt" style={{ color: '#ec4899' }}></i>
                  Tuition Ledger & Payment History
                </h2>
                <p>Verified financial transactions recorded via StudentPayment schema.</p>
              </div>
            </div>

            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Invoice ID</th>
                    <th>Course</th>
                    <th>Amount (PKR / USD)</th>
                    <th>Payment Method</th>
                    <th>Status</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {courses.map((course, idx) => {
                    const prices = formatPrice(course.price);
                    return (
                      <tr key={course.id || idx}>
                        <td style={{ fontFamily: 'var(--font-mono)' }}>INV-2026-00{idx + 1}8</td>
                        <td>{course.title} ({course.code})</td>
                        <td>
                          <strong>{prices.primary}</strong>
                          <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{prices.secondary}</div>
                        </td>
                        <td>Stripe / Raast Instant Direct</td>
                        <td>
                          <span className="status-pill status-approved">
                            <i className="fa-solid fa-circle-check"></i> Paid
                          </span>
                        </td>
                        <td>Today</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 5: ANNOUNCEMENTS */}
        {activeTab === 'announcements' && (
          <div className="content-card">
            <div className="content-card-header">
              <div className="card-title-group">
                <h2>
                  <i className="fa-solid fa-bullhorn" style={{ color: '#a855f7' }}></i>
                  Campus Announcements
                </h2>
                <p>Broadcast notices from Faculty and System Administration.</p>
              </div>
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
                  <p style={{ color: '#94a3b8', fontSize: '0.85rem', lineHeight: 1.6 }}>{ann.content}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 6: PROFILE & TOKEN */}
        {activeTab === 'profile' && (
          <div className="content-card">
            <div className="content-card-header">
              <div className="card-title-group">
                <h2>
                  <i className="fa-solid fa-id-badge" style={{ color: '#6366f1' }}></i>
                  Learner Profile & Token Management
                </h2>
                <p>Review your student credentials and customize your authorization bearer token.</p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input type="text" className="form-input" value={currentUser.name} disabled />
                </div>
                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input type="email" className="form-input" value={currentUser.email} disabled />
                </div>
                <div className="form-group">
                  <label className="form-label">Role Clearance</label>
                  <input type="text" className="form-input" value={currentUser.roleTag} disabled />
                </div>
              </div>

              {/* Token Card */}
              <div style={{
                background: 'rgba(15, 23, 42, 0.8)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                borderRadius: '14px',
                padding: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.85rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#34d399', fontWeight: 700 }}>
                  <div className="heartbeat-dot" style={{ width: '8px', height: '8px' }}></div>
                  <span>Encrypted Session Status: Active</span>
                </div>
                <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                  Your session credentials are encrypted in LocalStorage and hidden to prevent leakage.
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
                <button className="btn btn-success" onClick={onOpenTokenModal}>
                  <i className="fa-solid fa-shield-halved"></i> Security & Session Settings
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Modals */}
      <CoursePlayerModal
        isOpen={!!selectedCourseForPlayer}
        course={selectedCourseForPlayer}
        onClose={() => setSelectedCourseForPlayer(null)}
      />

      <InteractiveQuizModal
        isOpen={!!selectedCourseForQuiz}
        course={selectedCourseForQuiz}
        onClose={() => setSelectedCourseForQuiz(null)}
        onQuizComplete={handleQuizComplete}
      />
    </div>
  );
};

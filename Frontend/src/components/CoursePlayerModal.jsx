import React, { useState } from 'react';

const LESSONS = [
  { id: 1, title: "1. Core Platform Architecture & Async Database Pool", duration: "18:45", completed: true },
  { id: 2, title: "2. The 4-Tier Strict Role Hierarchy (Super Admin down to Student)", duration: "24:10", completed: true },
  { id: 3, title: "3. Soft-Deletion & The Super Admin Approval Matrix", duration: "32:00", completed: false },
  { id: 4, title: "4. Immutable Forensic Audit Trail & Forensics", duration: "21:15", completed: false },
  { id: 5, title: "5. Production Deployment, Layerbase PostgreSQL 18 & Turso", duration: "27:50", completed: false },
];

export const CoursePlayerModal = ({ isOpen, onClose, course }) => {
  const [activeLesson, setActiveLesson] = useState(LESSONS[2]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [completedLessons, setCompletedLessons] = useState({ 1: true, 2: true });

  if (!isOpen || !course) return null;

  const toggleLessonComplete = (id) => {
    setCompletedLessons(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const progressPct = Math.round((Object.values(completedLessons).filter(Boolean).length / LESSONS.length) * 100);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-dialog modal-xl" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3>
              <i className="fa-solid fa-circle-play" style={{ color: '#6366f1' }}></i>
              {course.title}
            </h3>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
              Course Code: {course.code} • Progress: {progressPct}% Completed
            </span>
          </div>
          <button className="close-btn" onClick={onClose}><i className="fa-solid fa-xmark"></i></button>
        </div>

        <div className="modal-body" style={{ padding: 0 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 340px', minHeight: '520px' }}>
            {/* Main Player Area */}
            <div style={{ display: 'flex', flexDirection: 'column', background: '#070b13', borderRight: '1px solid var(--border-color)' }}>
              {/* Mock Video Canvas */}
              <div style={{
                height: '360px',
                background: 'radial-gradient(ellipse at center, #1e1b4b 0%, #090d16 100%)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                overflow: 'hidden'
              }}>
                <div style={{
                  position: 'absolute',
                  top: '1rem',
                  left: '1rem',
                  background: 'rgba(0, 0, 0, 0.6)',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                  color: '#e2e8f0',
                  backdropFilter: 'blur(4px)'
                }}>
                  <i className="fa-solid fa-video" style={{ color: '#10b981', marginRight: '6px' }}></i>
                  Interactive Lecture Stream • 1080p 60fps
                </div>

                <button
                  type="button"
                  onClick={() => setIsPlaying(!isPlaying)}
                  style={{
                    width: '72px',
                    height: '72px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #4f46e5, #9333ea)',
                    border: 'none',
                    color: '#fff',
                    fontSize: '1.8rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    boxShadow: '0 0 30px rgba(99, 102, 241, 0.6)',
                    transition: 'transform 0.2s'
                  }}
                >
                  <i className={`fa-solid ${isPlaying ? 'fa-pause' : 'fa-play'}`} style={{ marginLeft: isPlaying ? '0' : '4px' }}></i>
                </button>

                <div style={{
                  position: 'absolute',
                  bottom: '1rem',
                  left: '1rem',
                  right: '1rem',
                  background: 'rgba(15, 23, 42, 0.85)',
                  backdropFilter: 'blur(8px)',
                  padding: '0.65rem 1rem',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem'
                }}>
                  <button
                    onClick={() => setIsPlaying(!isPlaying)}
                    style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}
                  >
                    <i className={`fa-solid ${isPlaying ? 'fa-pause' : 'fa-play'}`}></i>
                  </button>
                  <div style={{ flex: 1, height: '4px', background: 'rgba(255, 255, 255, 0.2)', borderRadius: '2px', position: 'relative' }}>
                    <div style={{ width: '42%', height: '100%', background: '#6366f1', borderRadius: '2px' }}></div>
                  </div>
                  <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontFamily: 'var(--font-mono)' }}>
                    08:14 / {activeLesson.duration}
                  </span>
                  <button style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '0.8rem' }}>
                    <i className="fa-solid fa-volume-high"></i>
                  </button>
                </div>
              </div>

              {/* Lesson Details */}
              <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h4 style={{ color: '#fff', fontSize: '1.1rem', fontWeight: 700 }}>
                    {activeLesson.title}
                  </h4>
                  <button
                    className={`btn btn-sm ${completedLessons[activeLesson.id] ? 'btn-success' : 'btn-outline'}`}
                    onClick={() => toggleLessonComplete(activeLesson.id)}
                  >
                    <i className={`fa-solid ${completedLessons[activeLesson.id] ? 'fa-check-circle' : 'fa-circle'}`}></i>
                    {completedLessons[activeLesson.id] ? 'Completed' : 'Mark as Complete'}
                  </button>
                </div>
                <p style={{ color: '#94a3b8', fontSize: '0.85rem', lineHeight: 1.6 }}>
                  {course.description || "Master core concepts of modern enterprise software governance, relational schema designs with PostgreSQL, and strict role hierarchy enforcement."}
                </p>
              </div>
            </div>

            {/* Curriculum Sidebar */}
            <div style={{ display: 'flex', flexDirection: 'column', background: 'rgba(15, 23, 42, 0.5)' }}>
              <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-color)', fontWeight: 700, fontSize: '0.9rem', color: '#fff' }}>
                Course Modules ({LESSONS.length})
              </div>

              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                {LESSONS.map((les) => {
                  const isCurrent = activeLesson.id === les.id;
                  const isDone = completedLessons[les.id];
                  return (
                    <div
                      key={les.id}
                      onClick={() => setActiveLesson(les)}
                      style={{
                        padding: '1rem 1.25rem',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                        background: isCurrent ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                        borderLeft: isCurrent ? '3px solid #6366f1' : '3px solid transparent',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '0.75rem',
                        transition: 'background 0.15s'
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', overflow: 'hidden' }}>
                        <span style={{ fontSize: '0.82rem', fontWeight: isCurrent ? 700 : 500, color: isCurrent ? '#fff' : '#cbd5e1', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {les.title}
                        </span>
                        <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                          <i className="fa-regular fa-clock" style={{ marginRight: '4px' }}></i>{les.duration}
                        </span>
                      </div>
                      <span style={{ color: isDone ? '#10b981' : '#475569', fontSize: '1rem' }}>
                        <i className={`fa-solid ${isDone ? 'fa-circle-check' : 'fa-circle-play'}`}></i>
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Close Course Viewer
          </button>
        </div>
      </div>
    </div>
  );
};

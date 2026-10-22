// Sygnus Academia - React Enterprise Governance SPA
const { useState, useEffect, useCallback } = React;

const API_BASE = (typeof window !== "undefined" && window.location.origin && !window.location.origin.startsWith("file:") && !window.location.origin.includes("5173"))
  ? window.location.origin
  : "http://localhost:8000";

const PKR_RATE = 280; // Standard USD to PKR exchange rate

const ROLE_DISPLAY = {
  "super_admin": { title: "Apex Super Admin", roleTag: "LEVEL 4 — SUPER ADMIN", avatar: "SA", level: 4, icon: "fa-crown", color: "text-amber" },
  "admin": { title: "Sarah Connor (Admin)", roleTag: "LEVEL 3 — SYSTEM ADMIN", avatar: "AD", level: 3, icon: "fa-user-tie", color: "text-blue" },
  "teacher": { title: "Dr. Alan Turing", roleTag: "LEVEL 2 — FACULTY / TEACHER", avatar: "AT", level: 2, icon: "fa-chalkboard-user", color: "text-purple" },
  "student": { title: "Alice Johnson", roleTag: "LEVEL 1 — STUDENT LEARNER", avatar: "AJ", level: 1, icon: "fa-user-graduate", color: "text-emerald" }
};

function App() {
  // Security & Auth States (Admin and SuperAdmin hidden by default)
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(() => {
    return sessionStorage.getItem("sygnus_admin_unlocked") === "true";
  });
  const [isSuperAdminUnlocked, setIsSuperAdminUnlocked] = useState(() => {
    return sessionStorage.getItem("sygnus_super_admin_unlocked") === "true";
  });

  const [activeRole, setActiveRole] = useState(() => {
    if (sessionStorage.getItem("sygnus_super_admin_unlocked") === "true") return "super_admin";
    if (sessionStorage.getItem("sygnus_admin_unlocked") === "true") return "admin";
    return "student"; // Default Learner Persona
  });

  const [activeTab, setActiveTab] = useState("overview");
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(false);

  // Currency State: Default PKR, with instant swap to USD
  const [currency, setCurrency] = useState(() => {
    return localStorage.getItem("sygnus_currency") || "PKR";
  });

  // Easter egg logo clicks counter
  const [logoClicks, setLogoClicks] = useState(0);

  // Auth Inputs
  const [adminAuth, setAdminAuth] = useState({ email: "sarah.admin@sygnus.edu", password: "AdminSecret123!" });
  const [superAdminKey, setSuperAdminKey] = useState("SuperAdmin123!");

  // Data States
  const [metrics, setMetrics] = useState({
    pending_deletion_requests: 0,
    pending_edit_requests: 0,
    total_admins: 0,
    total_teachers: 0,
    total_students: 0,
    active_sessions: 1,
    unresolved_security_events: 0,
    quarantined_items: 0,
    recent_audit_events: 0
  });

  const [pendingDeletions, setPendingDeletions] = useState([]);
  const [pendingEdits, setPendingEdits] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);
  const [trashBin, setTrashBin] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [courses, setCourses] = useState([]);
  const [announcements, setAnnouncements] = useState([]);

  // Modals state
  const [modalType, setModalType] = useState(null);
  const [formData, setFormData] = useState({});

  // API Sandbox State
  const [sandboxEndpoint, setSandboxEndpoint] = useState("/api/courses/");
  const [sandboxMethod, setSandboxMethod] = useState("GET");
  const [sandboxBody, setSandboxBody] = useState('{\n  "title": "Quantum AI Governance",\n  "code": "CS-990",\n  "price": 45000\n}');
  const [sandboxResponse, setSandboxResponse] = useState(null);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Currency Formatter Helper
  const formatPrice = (amount) => {
    if (amount === undefined || amount === null || isNaN(amount)) {
      return { primary: currency === "PKR" ? "PKR 0" : "$0.00", secondary: "" };
    }
    const num = parseFloat(amount);
    // Check if stored in USD base (< 2000) or PKR base
    const isUsdBase = num < 2000;
    const usdVal = isUsdBase ? num : (num / PKR_RATE);
    const pkrVal = isUsdBase ? (num * PKR_RATE) : num;

    if (currency === "PKR") {
      return {
        primary: `PKR ${Math.round(pkrVal).toLocaleString()}`,
        secondary: `≈ $${usdVal.toFixed(2)} USD`
      };
    } else {
      return {
        primary: `$${usdVal.toFixed(2)}`,
        secondary: `≈ PKR ${Math.round(pkrVal).toLocaleString()}`
      };
    }
  };

  const handleToggleCurrency = (newCurr) => {
    setCurrency(newCurr);
    localStorage.setItem("sygnus_currency", newCurr);
    showToast(`Currency switched to ${newCurr === 'PKR' ? 'Pakistani Rupee (PKR)' : 'US Dollar (USD)'}`, "info");
  };

  // URL Hash, Secret Keyboard Sequence & Keybind Trigger Listeners
  useEffect(() => {
    const checkUrlHash = () => {
      const hash = window.location.hash.toLowerCase();
      if (hash === "#admin" || hash === "#admin-login" || hash === "#login-as-admin" || hash === "#admin-portal") {
        setModalType("admin-login");
      } else if (hash === "#apex-vault" || hash === "#super-admin" || hash === "#secret-vault" || hash === "#vault" || hash === "#superadmin" || hash === "#secret-superadmin") {
        setModalType("secret-super-admin");
      }
    };

    checkUrlHash();
    window.addEventListener("hashchange", checkUrlHash);

    // Secret Keybind: Ctrl+Shift+S OR typing 'superadmin' anywhere opens Super Admin Secret Vault
    let keySequenceBuffer = "";
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.shiftKey && (e.key === "S" || e.key === "s")) {
        e.preventDefault();
        setModalType("secret-super-admin");
        return;
      }
      // Check if user is typing 'superadmin' sequence (not inside an input element)
      const targetTag = document.activeElement ? document.activeElement.tagName : "";
      if (targetTag === "INPUT" || targetTag === "TEXTAREA" || targetTag === "SELECT") return;

      if (e.key && e.key.length === 1) {
        keySequenceBuffer = (keySequenceBuffer + e.key.toLowerCase()).slice(-10);
        if (keySequenceBuffer === "superadmin") {
          setModalType("secret-super-admin");
          keySequenceBuffer = "";
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("hashchange", checkUrlHash);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // 5-click secret easter egg on the shield logo (completely silent until 5th click)
  const handleLogoClick = () => {
    setLogoClicks((prev) => {
      const next = prev + 1;
      if (next >= 5) {
        setModalType("secret-super-admin");
        showToast("APEX SECURITY PROTOCOL TRIGGERED — Master Clearance Required", "info");
        return 0;
      }
      return next;
    });
  };

  const handleEnrollStudent = async (courseId) => {
    try {
      const studentId = students.length > 0 ? students[0].id : null;
      if (!studentId) {
        showToast("No active student learner profile found", "error");
        return;
      }
      const res = await fetch(`${API_BASE}/api/courses/${courseId}/enroll?student_id=${studentId}`, {
        method: "POST"
      });
      if (res.ok) {
        const data = await res.json();
        showToast(data.message || "Enrolled successfully in course!", "success");
        fetchAllData();
      } else {
        const err = await res.json();
        showToast(err.detail || "Enrollment failed", "error");
      }
    } catch (e) {
      showToast("Error communicating with server", "error");
    }
  };

  const handleCreateAnnouncementSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/api/governance/announcements?title=${encodeURIComponent(formData.ann_title || '')}&content=${encodeURIComponent(formData.ann_content || '')}&target=${encodeURIComponent(formData.ann_target || 'ALL')}`, {
        method: "POST",
        headers: { "X-Actor-Role": activeRole }
      });
      if (res.ok) {
        showToast("Governance Announcement Broadcasted!", "success");
        setModalType(null);
        setFormData({});
        fetchAllData();
      } else {
        const err = await res.json();
        showToast(err.detail || "Failed to publish announcement", "error");
      }
    } catch (e) {
      showToast("Server error broadcasting announcement", "error");
    }
  };

  // Admin Login Handler
  const handleAdminLoginSubmit = (e) => {
    e.preventDefault();
    if (!adminAuth.password || adminAuth.password.length < 4) {
      showToast("Invalid admin credential", "error");
      return;
    }
    setIsAdminUnlocked(true);
    sessionStorage.setItem("sygnus_admin_unlocked", "true");
    setActiveRole("admin");
    setModalType(null);
    showToast("System Administrator (Level 3) Access Granted!", "success");
    if (window.location.hash === "#admin" || window.location.hash === "#admin-login") {
      history.replaceState(null, null, ' ');
    }
  };

  // Super Admin Secret Vault Handler
  const handleSuperAdminAuthSubmit = (e) => {
    e.preventDefault();
    if (superAdminKey.trim() !== "SuperAdmin123!" && superAdminKey.trim() !== "ApexKey-2026") {
      showToast("Access Denied: Invalid Master Security Key", "error");
      return;
    }
    setIsSuperAdminUnlocked(true);
    setIsAdminUnlocked(true);
    sessionStorage.setItem("sygnus_super_admin_unlocked", "true");
    sessionStorage.setItem("sygnus_admin_unlocked", "true");
    setActiveRole("super_admin");
    setModalType(null);
    showToast("APEX GOVERNANCE LEVEL 4 GRANTED — Super Admin Master Clearance Verified", "success");
    if (window.location.hash.includes("vault") || window.location.hash.includes("super")) {
      history.replaceState(null, null, ' ');
    }
  };

  // Lock Handlers
  const handleLockAdmin = () => {
    setIsAdminUnlocked(false);
    sessionStorage.removeItem("sygnus_admin_unlocked");
    setActiveRole("student");
    setActiveTab("overview");
    showToast("Admin session locked. Returned to Learner view.", "info");
  };

  const handleLockSuperAdmin = () => {
    setIsSuperAdminUnlocked(false);
    sessionStorage.removeItem("sygnus_super_admin_unlocked");
    setActiveRole(isAdminUnlocked ? "admin" : "student");
    setActiveTab("overview");
    showToast("Apex Secret Vault locked. Super Admin hidden.", "info");
  };

  // Determine which roles are visible in the persona switcher
  const visibleRoles = ["student", "teacher"];
  if (isAdminUnlocked) visibleRoles.push("admin");
  if (isSuperAdminUnlocked) visibleRoles.push("super_admin");

  const fetchAllData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Metrics
      const resMetrics = await fetch(`${API_BASE}/api/super-admin/dashboard`, {
        headers: { "X-Actor-Role": activeRole }
      }).catch(() => null);
      if (resMetrics && resMetrics.ok) {
        setMetrics(await resMetrics.json());
      }

      // 2. Pending Deletions
      const resDel = await fetch(`${API_BASE}/api/governance/deletion-requests`, {
        headers: { "X-Actor-Role": activeRole }
      }).catch(() => null);
      if (resDel && resDel.ok) {
        setPendingDeletions(await resDel.json());
      }

      // 3. Pending Edits
      const resEdit = await fetch(`${API_BASE}/api/governance/edit-requests`, {
        headers: { "X-Actor-Role": activeRole }
      }).catch(() => null);
      if (resEdit && resEdit.ok) {
        setPendingEdits(await resEdit.json());
      }

      // 4. Admins
      const resAdmins = await fetch(`${API_BASE}/api/super-admin/admins`, {
        headers: { "X-Actor-Role": activeRole }
      }).catch(() => null);
      if (resAdmins && resAdmins.ok) {
        setAdmins(await resAdmins.json());
      }

      // 5. Teachers
      const resTeachers = await fetch(`${API_BASE}/teachers/`, {
        headers: { "X-Actor-Role": activeRole }
      }).catch(() => null);
      if (resTeachers && resTeachers.ok) {
        setTeachers(await resTeachers.json());
      }

      // 6. Students
      const resStudents = await fetch(`${API_BASE}/students/`, {
        headers: { "X-Actor-Role": activeRole }
      }).catch(() => null);
      if (resStudents && resStudents.ok) {
        setStudents(await resStudents.json());
      }

      // 7. Trash Bin
      const resTrash = await fetch(`${API_BASE}/api/governance/trash-bin`, {
        headers: { "X-Actor-Role": activeRole }
      }).catch(() => null);
      if (resTrash && resTrash.ok) {
        const trashData = await resTrash.json();
        setTrashBin(Array.isArray(trashData) ? trashData : []);
      }

      // 8. Audit Logs
      const resLogs = await fetch(`${API_BASE}/api/governance/audit-logs`, {
        headers: { "X-Actor-Role": activeRole }
      }).catch(() => null);
      if (resLogs && resLogs.ok) {
        setAuditLogs(await resLogs.json());
      }

      // 9. Courses
      const resCourses = await fetch(`${API_BASE}/api/courses/`, {
        headers: { "X-Actor-Role": activeRole }
      }).catch(() => null);
      if (resCourses && resCourses.ok) {
        setCourses(await resCourses.json());
      }

      // 10. Announcements
      const resAnn = await fetch(`${API_BASE}/api/governance/announcements`, {
        headers: { "X-Actor-Role": activeRole }
      }).catch(() => null);
      if (resAnn && resAnn.ok) {
        setAnnouncements(await resAnn.json());
      }
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  }, [activeRole]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const handleRoleChange = (role) => {
    setActiveRole(role);
    const persona = ROLE_DISPLAY[role];
    showToast(`Active Persona: ${persona.title} (${persona.roleTag})`, "info");
    if (role !== "super_admin" && ["approval-queue", "admin-mgmt", "trash-bin", "audit-logs"].includes(activeTab)) {
      setActiveTab("overview");
    }
  };

  // Actions
  const handleDecideDeletion = async (id, decision) => {
    try {
      const res = await fetch(`${API_BASE}/api/governance/deletion-requests/${id}/decision`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Actor-Role": activeRole
        },
        body: JSON.stringify({ decision, note: `Decided ${decision} by ${activeRole}` })
      });
      if (res.ok) {
        showToast(`Deletion Request ${decision} successfully!`, "success");
        fetchAllData();
      } else {
        const err = await res.json();
        showToast(err.detail || "Action failed", "error");
      }
    } catch (e) {
      showToast("Server communication error", "error");
    }
  };

  const handleDecideEdit = async (id, decision) => {
    try {
      const res = await fetch(`${API_BASE}/api/governance/edit-requests/${id}/decision`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Actor-Role": activeRole
        },
        body: JSON.stringify({ decision, note: `Edit ${decision} by ${activeRole}` })
      });
      if (res.ok) {
        showToast(`Edit Request ${decision} successfully!`, "success");
        fetchAllData();
      } else {
        const err = await res.json();
        showToast(err.detail || "Action failed", "error");
      }
    } catch (e) {
      showToast("Server communication error", "error");
    }
  };

  const handleRestoreItem = async (type, id) => {
    try {
      const res = await fetch(`${API_BASE}/api/governance/restore/${type}/${id}`, {
        method: "POST",
        headers: { "X-Actor-Role": activeRole }
      });
      if (res.ok) {
        showToast(`Entity (${type}) restored successfully!`, "success");
        fetchAllData();
      } else {
        const err = await res.json();
        showToast(err.detail || "Restore failed", "error");
      }
    } catch (e) {
      showToast("Server communication error", "error");
    }
  };

  const handleCreateAdminSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/api/super-admin/admins?name=${encodeURIComponent(formData.name)}&email=${encodeURIComponent(formData.email)}&password=${encodeURIComponent(formData.password || 'AdminSecret123!')}`, {
        method: "POST",
        headers: { "X-Actor-Role": activeRole }
      });
      if (res.ok) {
        showToast("New Admin Account created successfully!", "success");
        setModalType(null);
        setFormData({});
        fetchAllData();
      } else {
        const err = await res.json();
        showToast(err.detail || "Failed to create Admin", "error");
      }
    } catch (e) {
      showToast("API error creating admin", "error");
    }
  };

  const handleCreateCourseSubmit = async (e) => {
    e.preventDefault();
    try {
      // If entered in PKR, store appropriately or normalized
      const priceVal = formData.price || (currency === 'PKR' ? 45000 : 199.99);
      const res = await fetch(`${API_BASE}/api/courses/?title=${encodeURIComponent(formData.title)}&code=${encodeURIComponent(formData.code)}&description=${encodeURIComponent(formData.description || '')}&price=${priceVal}&subject=${encodeURIComponent(formData.subject || 'Computer Science')}`, {
        method: "POST",
        headers: { "X-Actor-Role": activeRole }
      });
      if (res.ok) {
        showToast("Course created successfully!", "success");
        setModalType(null);
        setFormData({});
        fetchAllData();
      } else {
        const err = await res.json();
        showToast(err.detail || "Failed to create course", "error");
      }
    } catch (e) {
      showToast("API error creating course", "error");
    }
  };

  const handleRequestDeletionSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/api/governance/deletion-requests`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Actor-Role": activeRole
        },
        body: JSON.stringify({
          entity_type: formData.entity_type,
          entity_id: formData.entity_id,
          request_reason: formData.request_reason
        })
      });
      if (res.ok) {
        showToast("Deletion Request submitted for Super Admin Approval!", "info");
        setModalType(null);
        setFormData({});
        fetchAllData();
      } else {
        const err = await res.json();
        showToast(err.detail || "Request submission failed", "error");
      }
    } catch (e) {
      showToast("API error submitting deletion request", "error");
    }
  };

  const handleRunSandbox = async () => {
    setSandboxResponse({ status: "LOADING...", data: "Executing request..." });
    try {
      const options = {
        method: sandboxMethod,
        headers: {
          "Content-Type": "application/json",
          "X-Actor-Role": activeRole
        }
      };
      if (["POST", "PUT", "PATCH"].includes(sandboxMethod) && sandboxBody) {
        options.body = sandboxBody;
      }
      const startTime = performance.now();
      const res = await fetch(`${API_BASE}${sandboxEndpoint}`, options);
      const endTime = performance.now();
      const statusText = `${res.status} ${res.statusText} (${Math.round(endTime - startTime)}ms)`;
      let json = {};
      try {
        json = await res.json();
      } catch (err) {
        json = { response_text: "No JSON payload returned" };
      }
      setSandboxResponse({
        status: statusText,
        statusCode: res.status,
        ok: res.ok,
        data: json
      });
      showToast(`API Sandbox Executed: HTTP ${res.status}`, res.ok ? "success" : "error");
    } catch (e) {
      setSandboxResponse({ status: "ERROR", data: { error: e.message } });
      showToast(`Sandbox Error: ${e.message}`, "error");
    }
  };

  const totalPendingCount = (pendingDeletions.length || 0) + (pendingEdits.length || 0);

  return (
    <div className="react-root-container">
      {/* Toast Notification */}
      {toast && (
        <div className={`toast toast-${toast.type} animate-bounce`}>
          <i className={`fa-solid ${toast.type === 'success' ? 'fa-circle-check text-emerald' : toast.type === 'error' ? 'fa-circle-xmark text-red' : 'fa-circle-info text-blue'}`}></i>
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header Bar */}
      <header className="app-header">
        <div className="header-container">
          {/* Logo with Secret 5-Click Trigger */}
          <div className="brand-logo" onClick={handleLogoClick} title="Sygnus Academia — Enterprise Governance Platform">
            <div className="logo-icon secret-trigger-icon">
              <i className="fa-solid fa-shield-halved"></i>
            </div>
            <div className="brand-text">
              <span className="brand-title">SYGNUS ACADEMIA</span>
              <span className="brand-subtitle">POSTGRESQL 18 & TURSO ENTERPRISE GOVERNANCE</span>
            </div>
          </div>

          <div className="header-actions">
            {/* Currency Switcher */}
            <div className="currency-switcher" title="Instant Currency Swap">
              <button
                className={`currency-btn ${currency === 'PKR' ? 'active' : ''}`}
                onClick={() => handleToggleCurrency('PKR')}
              >
                <span>🇵🇰</span> PKR (Rs)
              </button>
              <button
                className={`currency-btn ${currency === 'USD' ? 'active' : ''}`}
                onClick={() => handleToggleCurrency('USD')}
              >
                <span>💵</span> USD ($)
              </button>
            </div>

            {/* Role Switcher (Hidden Admin & Secret Super Admin) */}
            <div className="role-switcher-container">
              <span className="switcher-label"><i className="fa-solid fa-user-astronaut"></i> Active Persona:</span>
              <div className="role-pills">
                {visibleRoles.map((roleKey) => {
                  const info = ROLE_DISPLAY[roleKey];
                  return (
                    <button
                      key={roleKey}
                      className={`role-pill ${activeRole === roleKey ? 'active' : ''}`}
                      onClick={() => handleRoleChange(roleKey)}
                    >
                      <i className={`fa-solid ${info.icon} ${info.color}`}></i> {info.title.split(' ')[0]} {info.title.includes('Admin') ? 'Admin' : ''}
                    </button>
                  );
                })}

                {/* Login as Admin Portal Button when Admin is not unlocked */}
                {!isAdminUnlocked && (
                  <button
                    className="portal-btn"
                    onClick={() => setModalType('admin-login')}
                    title="Login as Admin (or navigate to #admin in URL)"
                  >
                    <i className="fa-solid fa-lock text-blue"></i> Login as Admin
                  </button>
                )}

                {/* Discrete Lock Buttons */}
                {isAdminUnlocked && !isSuperAdminUnlocked && (
                  <button
                    className="portal-btn lock-active"
                    onClick={handleLockAdmin}
                    title="Lock Admin Session"
                  >
                    <i className="fa-solid fa-arrow-right-from-bracket"></i> Exit Admin
                  </button>
                )}

                {isSuperAdminUnlocked && (
                  <button
                    className="portal-btn lock-active"
                    onClick={handleLockSuperAdmin}
                    title="Lock Apex Vault & Hide Super Admin"
                  >
                    <i className="fa-solid fa-shield-halved"></i> Lock Vault
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="main-layout">
        {/* Sidebar */}
        <aside className="sidebar">
          <div className="user-badge">
            <div className="avatar">{ROLE_DISPLAY[activeRole].avatar}</div>
            <div className="user-info">
              <div className="user-name">{ROLE_DISPLAY[activeRole].title}</div>
              <div className="user-role-tag">{ROLE_DISPLAY[activeRole].roleTag}</div>
            </div>
          </div>

          <nav className="side-nav">
            <div className="nav-section-title">DASHBOARD & WORKSPACES</div>
            <a href="#overview" className={`nav-item ${activeTab === 'overview' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setActiveTab('overview'); }}>
              <i className="fa-solid fa-chart-line"></i> Analytics & Metrics
            </a>

            {/* SUPER ADMIN ONLY SECTION (Hidden until Secret Vault Unlocked) */}
            {activeRole === 'super_admin' && (
              <>
                <a href="#approval-queue" className={`nav-item ${activeTab === 'approval-queue' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setActiveTab('approval-queue'); }}>
                  <i className="fa-solid fa-clipboard-check"></i> Approval Queue
                  {totalPendingCount > 0 && <span className="badge badge-pulse">{totalPendingCount}</span>}
                </a>
                <a href="#admin-mgmt" className={`nav-item ${activeTab === 'admin-mgmt' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setActiveTab('admin-mgmt'); }}>
                  <i className="fa-solid fa-users-gear"></i> Admin Management
                </a>
                <a href="#trash-bin" className={`nav-item ${activeTab === 'trash-bin' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setActiveTab('trash-bin'); }}>
                  <i className="fa-solid fa-trash-arrow-up"></i> Trash Bin (Soft Delete)
                </a>
                <a href="#audit-logs" className={`nav-item ${activeTab === 'audit-logs' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setActiveTab('audit-logs'); }}>
                  <i className="fa-solid fa-list-check"></i> Security & Audit Logs
                </a>
              </>
            )}

            <div className="nav-section-title">ACADEMIC & SCHEMAS</div>
            <a href="#courses" className={`nav-item ${activeTab === 'courses' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setActiveTab('courses'); }}>
              <i className="fa-solid fa-book-open"></i> Courses Directory
            </a>
            <a href="#teachers-dir" className={`nav-item ${activeTab === 'teachers-dir' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setActiveTab('teachers-dir'); }}>
              <i className="fa-solid fa-id-card"></i> Teachers Directory
            </a>
            <a href="#students-dir" className={`nav-item ${activeTab === 'students-dir' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setActiveTab('students-dir'); }}>
              <i className="fa-solid fa-graduation-cap"></i> Students Directory
            </a>
            <a href="#announcements" className={`nav-item ${activeTab === 'announcements' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setActiveTab('announcements'); }}>
              <i className="fa-solid fa-bullhorn"></i> Announcements
            </a>
            <a href="#api-sandbox" className={`nav-item ${activeTab === 'api-sandbox' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setActiveTab('api-sandbox'); }}>
              <i className="fa-solid fa-code"></i> API Models Sandbox
            </a>
          </nav>

          <div className="governance-rule-box">
            <div className="rule-title"><i className="fa-solid fa-lock text-gold"></i> Cloud Database</div>
            <div className="rule-desc">
              Connected to Layerbase PostgreSQL 18 with asyncpg connection pool & SSL enforcement. Active Currency: <strong>{currency}</strong>.
            </div>
          </div>
        </aside>

        {/* Content Area */}
        <main className="content-area">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="tab-content active">
              <div className="workspace-header">
                <div>
                  <h1 className="page-title">Executive Governance Dashboard</h1>
                  <p className="page-subtitle">Real-time statistics across PostgreSQL models, security logs, and role hierarchy.</p>
                </div>
                <div className="action-buttons">
                  <button className="btn btn-primary" onClick={fetchAllData}><i className="fa-solid fa-arrows-rotate"></i> Refresh System Stats</button>
                </div>
              </div>

              <div className="metrics-grid">
                <div className="metric-card gold">
                  <div className="metric-header">
                    <span className="metric-label">Pending Approvals</span>
                    <i className="fa-solid fa-clock-rotate-left metric-icon"></i>
                  </div>
                  <div className="metric-value">{totalPendingCount}</div>
                  <div className="metric-subtext">Requires Super Admin decision</div>
                </div>

                <div className="metric-card blue">
                  <div className="metric-header">
                    <span className="metric-label">System Admins</span>
                    <i className="fa-solid fa-user-shield metric-icon"></i>
                  </div>
                  <div className="metric-value">{admins.length || metrics.total_admins || 0}</div>
                  <div className="metric-subtext">Level 3 System Administrators</div>
                </div>

                <div className="metric-card purple">
                  <div className="metric-header">
                    <span className="metric-label">Active Faculty</span>
                    <i className="fa-solid fa-chalkboard-user metric-icon"></i>
                  </div>
                  <div className="metric-value">{teachers.length || metrics.total_teachers || 0}</div>
                  <div className="metric-subtext">Level 2 Teaching Staff</div>
                </div>

                <div className="metric-card emerald">
                  <div className="metric-header">
                    <span className="metric-label">Enrolled Learners</span>
                    <i className="fa-solid fa-graduation-cap metric-icon"></i>
                  </div>
                  <div className="metric-value">{students.length || metrics.total_students || 0}</div>
                  <div className="metric-subtext">Level 1 Student Members</div>
                </div>
              </div>

              {/* Status Banner */}
              <div className="panel mt-6">
                <div className="panel-header">
                  <h2 className="panel-title"><i className="fa-solid fa-server text-emerald"></i> Infrastructure & Security Status</h2>
                </div>
                <div className="panel-body">
                  <div className="status-grid">
                    <div className="status-item">
                      <div className="status-label">Database Connection</div>
                      <div className="status-val text-emerald"><i className="fa-solid fa-circle-check"></i> Layerbase PostgreSQL 18 Online</div>
                    </div>
                    <div className="status-item">
                      <div className="status-label">Platform Currency</div>
                      <div className="status-val text-blue"><i className="fa-solid fa-coins"></i> {currency === 'PKR' ? 'Pakistani Rupee (PKR)' : 'US Dollar (USD)'} [1 USD = 280 PKR]</div>
                    </div>
                    <div className="status-item">
                      <div className="status-label">Security Protocol</div>
                      <div className="status-val text-purple"><i className="fa-solid fa-shield"></i> Hidden Admin & Secret Vault Active</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: APPROVAL QUEUE */}
          {activeTab === 'approval-queue' && activeRole === 'super_admin' && (
            <div className="tab-content active">
              <div className="workspace-header">
                <div>
                  <h1 className="page-title">Super Admin Approval Queue</h1>
                  <p className="page-subtitle">Strict Chain-of-Command Review for Deletion & Modification requests.</p>
                </div>
              </div>

              <div className="panel">
                <div className="panel-header">
                  <h2 className="panel-title"><i className="fa-solid fa-trash-can text-amber"></i> Pending Deletion Requests ({pendingDeletions.length})</h2>
                </div>
                <div className="panel-body p-0">
                  {pendingDeletions.length === 0 ? (
                    <div className="empty-state"><i className="fa-solid fa-circle-check text-emerald"></i> No pending deletion requests.</div>
                  ) : (
                    <div className="table-responsive">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Request ID</th>
                            <th>Target Entity</th>
                            <th>Entity ID</th>
                            <th>Requested By</th>
                            <th>Reason / Explanation</th>
                            <th>Status</th>
                            <th>Super Admin Decision</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pendingDeletions.map((item) => (
                            <tr key={item.id}>
                              <td><span className="cell-id-chip" title={item.id}>{item.id.substring(0, 8)}...</span></td>
                              <td><span className="badge badge-purple">{item.entity_type}</span></td>
                              <td><span className="cell-id-chip" title={item.entity_id}>{String(item.entity_id).substring(0, 8)}...</span></td>
                              <td><span className="badge badge-blue">{item.requested_by_type}</span></td>
                              <td className="cell-wrap">{item.request_reason}</td>
                              <td><span className="badge badge-amber">{item.status}</span></td>
                              <td className="cell-actions">
                                {item.status === 'PENDING' ? (
                                  <div className="btn-group">
                                    <button className="btn btn-sm btn-success" onClick={() => handleDecideDeletion(item.id, 'APPROVED')}>
                                      <i className="fa-solid fa-check"></i> Approve
                                    </button>
                                    <button className="btn btn-sm btn-danger" onClick={() => handleDecideDeletion(item.id, 'REJECTED')}>
                                      <i className="fa-solid fa-xmark"></i> Reject
                                    </button>
                                  </div>
                                ) : (
                                  <span className={`badge ${item.status === 'APPROVED' ? 'badge-emerald' : 'badge-red'}`}>{item.status}</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

              <div className="panel mt-6">
                <div className="panel-header">
                  <h2 className="panel-title"><i className="fa-solid fa-pen-to-square text-blue"></i> Pending Edit Requests ({pendingEdits.length})</h2>
                </div>
                <div className="panel-body p-0">
                  {pendingEdits.length === 0 ? (
                    <div className="empty-state"><i className="fa-solid fa-circle-check text-emerald"></i> No pending edit requests.</div>
                  ) : (
                    <div className="table-responsive">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Request ID</th>
                            <th>Target Entity</th>
                            <th>Entity ID</th>
                            <th>Reason / Explanation</th>
                            <th>Requested Values</th>
                            <th>Status</th>
                            <th>Decision</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pendingEdits.map((item) => (
                            <tr key={item.id}>
                              <td><span className="cell-id-chip" title={item.id}>{item.id.substring(0, 8)}...</span></td>
                              <td><span className="badge badge-blue">{item.entity_type}</span></td>
                              <td><span className="cell-id-chip" title={item.entity_id}>{String(item.entity_id).substring(0, 8)}...</span></td>
                              <td className="cell-wrap">{item.reason}</td>
                              <td className="cell-wrap">
                                <div className="kv-chip-container">
                                  {item.requested_values && typeof item.requested_values === 'object' ? (
                                    Object.entries(item.requested_values).map(([k, v]) => (
                                      <div key={k} className="kv-chip">
                                        <span className="kv-key">{k}:</span>
                                        <span className="kv-val">{String(v)}</span>
                                      </div>
                                    ))
                                  ) : (
                                    <span className="font-mono text-xs">{JSON.stringify(item.requested_values)}</span>
                                  )}
                                </div>
                              </td>
                              <td><span className="badge badge-amber">{item.status}</span></td>
                              <td className="cell-actions">
                                {item.status === 'PENDING' ? (
                                  <div className="btn-group">
                                    <button className="btn btn-sm btn-success" onClick={() => handleDecideEdit(item.id, 'APPROVED')}><i className="fa-solid fa-check"></i> Approve</button>
                                    <button className="btn btn-sm btn-danger" onClick={() => handleDecideEdit(item.id, 'REJECTED')}><i className="fa-solid fa-xmark"></i> Reject</button>
                                  </div>
                                ) : (
                                  <span className="badge badge-emerald">{item.status}</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: ADMIN MANAGEMENT */}
          {activeTab === 'admin-mgmt' && activeRole === 'super_admin' && (
            <div className="tab-content active">
              <div className="workspace-header">
                <div>
                  <h1 className="page-title">Admin Management Workspace</h1>
                  <p className="page-subtitle">Manage Level 3 System Administrators who oversee academic entities.</p>
                </div>
                <div className="action-buttons">
                  <button className="btn btn-primary" onClick={() => setModalType('create-admin')}>
                    <i className="fa-solid fa-user-plus"></i> Create New Admin
                  </button>
                </div>
              </div>

              <div className="panel">
                <div className="panel-body p-0">
                  <div className="table-responsive">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Admin Name</th>
                          <th>Email Address</th>
                          <th>Role Level</th>
                          <th>Account Status</th>
                          <th>Created Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {admins.map((adm) => (
                          <tr key={adm.id}>
                            <td className="font-semibold">{adm.name}</td>
                            <td>{adm.email}</td>
                            <td>
                              <span className={`badge ${adm.is_superadmin ? 'badge-amber' : 'badge-blue'}`}>
                                {adm.is_superadmin ? 'SUPER ADMIN (L4)' : 'ADMIN (L3)'}
                              </span>
                            </td>
                            <td><span className="badge badge-emerald">ACTIVE</span></td>
                            <td className="text-subtle">{adm.created_at ? new Date(adm.created_at).toLocaleDateString() : 'System Seeded'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: TRASH BIN */}
          {activeTab === 'trash-bin' && activeRole === 'super_admin' && (
            <div className="tab-content active">
              <div className="workspace-header">
                <div>
                  <h1 className="page-title">Soft-Deleted Entity Trash Bin</h1>
                  <p className="page-subtitle">Audit and restore soft-deleted records back into active production.</p>
                </div>
              </div>

              <div className="panel">
                <div className="panel-body p-0">
                  {trashBin.length === 0 ? (
                    <div className="empty-state"><i className="fa-solid fa-trash-arrow-up text-blue"></i> Trash bin is empty. No soft-deleted records found.</div>
                  ) : (
                    <div className="table-responsive">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Entity Type</th>
                            <th>Entity ID</th>
                            <th>Name / Identifier</th>
                            <th>Deleted Timestamp</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {trashBin.map((item) => (
                            <tr key={item.id}>
                              <td><span className="badge badge-purple">{item.entity_type}</span></td>
                              <td><span className="cell-id-chip" title={item.id}>{String(item.id).substring(0, 8)}...</span></td>
                              <td className="font-semibold cell-wrap">{item.name || item.title || item.email}</td>
                              <td className="text-subtle">{item.deleted_at ? new Date(item.deleted_at).toLocaleString() : 'Soft Deleted'}</td>
                              <td className="cell-actions">
                                <button className="btn btn-sm btn-primary" onClick={() => handleRestoreItem(item.entity_type, item.id)}>
                                  <i className="fa-solid fa-rotate-left"></i> Restore Entity
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: AUDIT LOGS */}
          {activeTab === 'audit-logs' && activeRole === 'super_admin' && (
            <div className="tab-content active">
              <div className="workspace-header">
                <div>
                  <h1 className="page-title">Immutable Security & Audit Trail</h1>
                  <p className="page-subtitle">Complete cryptographic ledger of all sensitive API requests and data operations on PostgreSQL 18.</p>
                </div>
              </div>

              <div className="panel">
                <div className="panel-body p-0">
                  <div className="table-responsive">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Request ID</th>
                          <th>Actor</th>
                          <th>Action</th>
                          <th>Entity Type</th>
                          <th>IP Address</th>
                          <th>Reason / Details</th>
                          <th>Timestamp</th>
                        </tr>
                      </thead>
                      <tbody>
                        {auditLogs.map((log) => (
                          <tr key={log.id}>
                            <td><span className="cell-id-chip" title={log.request_id || log.id}>{String(log.request_id || log.id).substring(0, 8)}...</span></td>
                            <td><span className="badge badge-blue">{log.actor_type}</span></td>
                            <td><span className="badge badge-amber">{log.action}</span></td>
                            <td><span className="badge badge-purple">{log.entity_type}</span></td>
                            <td><span className="font-mono text-xs" style={{ background: 'rgba(255,255,255,0.06)', padding: '2px 7px', borderRadius: '4px' }}>{log.ip_address || '127.0.0.1'}</span></td>
                            <td className="cell-wrap">{log.reason || 'System operation executed'}</td>
                            <td className="text-subtle text-xs" style={{ whiteSpace: 'nowrap' }}>{new Date(log.created_at).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: COURSES DIRECTORY */}
          {activeTab === 'courses' && (
            <div className="tab-content active">
              <div className="workspace-header">
                <div>
                  <h1 className="page-title">Academic Courses Directory</h1>
                  <p className="page-subtitle">Curriculum catalog with dual PKR/USD pricing and real-time conversion.</p>
                </div>
                <div className="action-buttons">
                  {['super_admin', 'admin', 'teacher'].includes(activeRole) && (
                    <button className="btn btn-primary" onClick={() => setModalType('create-course')}>
                      <i className="fa-solid fa-plus"></i> Add New Course
                    </button>
                  )}
                </div>
              </div>

              <div className="courses-grid">
                {courses.map((c) => {
                  const priceInfo = formatPrice(c.price);
                  return (
                    <div key={c.id} className="course-card">
                      <div className="course-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <span className="badge badge-purple">{c.code}</span>
                        <div className="course-price-container">
                          <span className="course-price-primary">{priceInfo.primary}</span>
                          <span className="course-price-secondary">{priceInfo.secondary}</span>
                        </div>
                      </div>
                      <h3 className="course-title">{c.title}</h3>
                      <p className="course-desc" title={c.description || 'Comprehensive curriculum module for advanced governance and software development.'}>
                        {c.description || 'Comprehensive curriculum module for advanced governance and software development.'}
                      </p>
                      <div className="course-footer">
                        <span className="badge badge-blue">{c.subject || 'General'}</span>
                        {activeRole === 'student' && (
                          <button
                            className="btn btn-sm btn-primary"
                            onClick={() => handleEnrollStudent(c.id)}
                          >
                            <i className="fa-solid fa-graduation-cap"></i> Enroll Now
                          </button>
                        )}
                        {['super_admin', 'admin'].includes(activeRole) && (
                          <button
                            className="btn btn-sm btn-danger"
                            onClick={() => {
                              setFormData({ entity_type: 'COURSE', entity_id: c.id, request_reason: `Request deletion of ${c.code}: ${c.title}` });
                              setModalType('request-deletion');
                            }}
                          >
                            <i className="fa-solid fa-trash"></i> Request Delete
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 7: TEACHERS DIRECTORY */}
          {activeTab === 'teachers-dir' && (
            <div className="tab-content active">
              <div className="workspace-header">
                <div>
                  <h1 className="page-title">Faculty & Teachers Directory</h1>
                  <p className="page-subtitle">Academic roster of professors, researchers, and instructors.</p>
                </div>
              </div>

              <div className="panel">
                <div className="panel-body p-0">
                  <div className="table-responsive">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Faculty Name</th>
                          <th>Email Address</th>
                          <th>Qualification</th>
                          <th>Profile Slug</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {teachers.map((t) => (
                          <tr key={t.id}>
                            <td className="font-semibold">{t.name}</td>
                            <td>{t.email}</td>
                            <td><span className="badge badge-emerald">{t.qualification_latest}</span></td>
                            <td className="font-mono text-xs">{t.profile_slug}</td>
                            <td className="cell-actions">
                              {['super_admin', 'admin'].includes(activeRole) && (
                                <button
                                  className="btn btn-sm btn-danger"
                                  onClick={() => {
                                    setFormData({ entity_type: 'TEACHER', entity_id: t.id, request_reason: `Request deletion of Faculty Member ${t.name}` });
                                    setModalType('request-deletion');
                                  }}
                                >
                                  Request Delete
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 8: STUDENTS DIRECTORY */}
          {activeTab === 'students-dir' && (
            <div className="tab-content active">
              <div className="workspace-header">
                <div>
                  <h1 className="page-title">Students & Learners Directory</h1>
                  <p className="page-subtitle">Enrolled student profiles and academic accounts.</p>
                </div>
              </div>

              <div className="panel">
                <div className="panel-body p-0">
                  <div className="table-responsive">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Student Name</th>
                          <th>Email Address</th>
                          <th>Account Status</th>
                          <th>Joined</th>
                        </tr>
                      </thead>
                      <tbody>
                        {students.map((st) => (
                          <tr key={st.id}>
                            <td className="font-semibold">{st.name}</td>
                            <td>{st.email}</td>
                            <td><span className="badge badge-emerald">ACTIVE</span></td>
                            <td className="text-subtle">Active Member</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 9: ANNOUNCEMENTS */}
          {activeTab === 'announcements' && (
            <div className="tab-content active">
              <div className="workspace-header">
                <div>
                  <h1 className="page-title">Platform Broadcast Announcements</h1>
                  <p className="page-subtitle">Official notifications and governance broadcasts.</p>
                </div>
                {['super_admin', 'admin'].includes(activeRole) && (
                  <div className="action-buttons">
                    <button className="btn btn-primary" onClick={() => setModalType('create-announcement')}>
                      <i className="fa-solid fa-bullhorn"></i> Broadcast Announcement
                    </button>
                  </div>
                )}
              </div>

              <div className="announcements-list">
                {announcements.map((ann) => (
                  <div key={ann.id} className="panel mb-4">
                    <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h3 className="panel-title"><i className="fa-solid fa-bullhorn text-amber"></i> {ann.title}</h3>
                      <span className="badge badge-blue">Target: {ann.target}</span>
                    </div>
                    <div className="panel-body">
                      <p style={{ lineHeight: 1.6, color: '#e2e8f0' }}>{ann.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 10: API SANDBOX */}
          {activeTab === 'api-sandbox' && (
            <div className="tab-content active">
              <div className="workspace-header">
                <div>
                  <h1 className="page-title">Live API & Schema Inspector Sandbox</h1>
                  <p className="page-subtitle">Send API requests directly to FastAPI endpoints and verify JSON sending/receiving models!</p>
                </div>
              </div>

              <div className="panel">
                <div className="panel-header">
                  <h2 className="panel-title"><i className="fa-solid fa-paper-plane text-purple"></i> Request Configuration</h2>
                </div>
                <div className="panel-body">
                  <div className="sandbox-grid">
                    <div className="form-group">
                      <label>HTTP Method</label>
                      <select className="form-input" value={sandboxMethod} onChange={(e) => setSandboxMethod(e.target.value)}>
                        <option value="GET">GET</option>
                        <option value="POST">POST</option>
                        <option value="PUT">PUT</option>
                        <option value="DELETE">DELETE</option>
                      </select>
                    </div>

                    <div className="form-group span-2">
                      <label>Endpoint Path</label>
                      <input className="form-input font-mono" value={sandboxEndpoint} onChange={(e) => setSandboxEndpoint(e.target.value)} />
                    </div>

                    <div className="form-group">
                      <label>&nbsp;</label>
                      <button className="btn btn-primary" onClick={handleRunSandbox}>
                        <i className="fa-solid fa-play"></i> Execute API Call
                      </button>
                    </div>
                  </div>

                  {["POST", "PUT", "PATCH"].includes(sandboxMethod) && (
                    <div className="form-group mt-4">
                      <label>JSON Request Body Payload</label>
                      <textarea className="form-input font-mono" rows="6" value={sandboxBody} onChange={(e) => setSandboxBody(e.target.value)}></textarea>
                    </div>
                  )}
                </div>
              </div>

              {sandboxResponse && (
                <div className="panel mt-6">
                  <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 className="panel-title"><i className="fa-solid fa-terminal text-emerald"></i> API Response Output</h2>
                    <span className={`badge ${sandboxResponse.ok ? 'badge-emerald' : 'badge-red'}`}>{sandboxResponse.status}</span>
                  </div>
                  <div className="panel-body p-0">
                    <pre className="json-output">{JSON.stringify(sandboxResponse.data, null, 2)}</pre>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* ========================================================
          MODAL 1: ADMIN LOGIN MODAL
          ======================================================== */}
      {modalType === 'admin-login' && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <h2><i className="fa-solid fa-user-shield text-blue"></i> Staff & Admin Portal Login</h2>
              <button className="close-btn" onClick={() => setModalType(null)}>&times;</button>
            </div>
            <form onSubmit={handleAdminLoginSubmit}>
              <div className="modal-body">
                <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '1rem' }}>
                  Restricted staff area. Authenticate with your System Administrator credentials to unlock Level 3 governance tools.
                </p>
                <div className="form-group">
                  <label>Admin Email Address</label>
                  <input
                    type="email"
                    className="form-input"
                    required
                    value={adminAuth.email}
                    onChange={(e) => setAdminAuth({ ...adminAuth, email: e.target.value })}
                  />
                </div>
                <div className="form-group mt-3">
                  <label>Password</label>
                  <input
                    type="password"
                    className="form-input"
                    required
                    value={adminAuth.password}
                    onChange={(e) => setAdminAuth({ ...adminAuth, password: e.target.value })}
                  />
                </div>

                <div className="demo-shortcut-box">
                  <span className="demo-shortcut-text">Quick Demo: Sarah Connor (Admin)</span>
                  <button
                    type="button"
                    className="demo-btn-link"
                    onClick={() => setAdminAuth({ email: "sarah.admin@sygnus.edu", password: "AdminSecret123!" })}
                  >
                    Fill Demo Credentials
                  </button>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setModalType(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary"><i className="fa-solid fa-key"></i> Authenticate & Enter</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 2: SECRET SUPER ADMIN APEX VAULT TERMINAL
          ======================================================== */}
      {modalType === 'secret-super-admin' && (
        <div className="modal-overlay">
          <div className="modal-card vault-modal-card">
            <div className="modal-header">
              <h2><i className="fa-solid fa-shield-halved text-amber"></i> [ APEX SECURITY ] Secret Vault Authorization</h2>
              <button className="close-btn" onClick={() => setModalType(null)}>&times;</button>
            </div>
            <form onSubmit={handleSuperAdminAuthSubmit}>
              <div className="modal-body">
                <div className="vault-banner">
                  <i className="fa-solid fa-triangle-exclamation" style={{ fontSize: '1.25rem' }}></i>
                  <div>
                    <strong>CONFIDENTIAL LEVEL 4 VAULT</strong>
                    <div>Strict Chain-of-Command. Requires Apex Master Security Passkey to unlock Super Admin privileges.</div>
                  </div>
                </div>

                <div className="form-group">
                  <label>Master Security Passkey</label>
                  <input
                    type="password"
                    className="form-input font-mono"
                    required
                    value={superAdminKey}
                    onChange={(e) => setSuperAdminKey(e.target.value)}
                    placeholder="Enter Master Security Key..."
                  />
                </div>

                <div className="demo-shortcut-box">
                  <span className="demo-shortcut-text">Apex Master Passkey: <code>SuperAdmin123!</code></span>
                  <button
                    type="button"
                    className="demo-btn-link"
                    onClick={() => setSuperAdminKey("SuperAdmin123!")}
                  >
                    Authorize Demo Master Key
                  </button>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setModalType(null)}>Abort</button>
                <button type="submit" className="btn btn-primary" style={{ background: 'linear-gradient(135deg, #d97706, #f59e0b)' }}>
                  <i className="fa-solid fa-unlock-keyhole"></i> Grant Level 4 Clearance
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 3: CREATE ADMIN
          ======================================================== */}
      {modalType === 'create-admin' && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <h2><i className="fa-solid fa-user-shield text-amber"></i> Create Admin Account</h2>
              <button className="close-btn" onClick={() => setModalType(null)}>&times;</button>
            </div>
            <form onSubmit={handleCreateAdminSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Full Name</label>
                  <input className="form-input" required value={formData.name || ''} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                </div>
                <div className="form-group mt-3">
                  <label>Email Address</label>
                  <input type="email" className="form-input" required value={formData.email || ''} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                </div>
                <div className="form-group mt-3">
                  <label>Password</label>
                  <input type="password" className="form-input" value={formData.password || ''} onChange={(e) => setFormData({ ...formData, password: e.target.value })} placeholder="AdminSecret123!" />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setModalType(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create Admin</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 4: CREATE COURSE (Dual PKR/USD Support)
          ======================================================== */}
      {modalType === 'create-course' && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <h2><i className="fa-solid fa-book-open text-purple"></i> Create Academic Course</h2>
              <button className="close-btn" onClick={() => setModalType(null)}>&times;</button>
            </div>
            <form onSubmit={handleCreateCourseSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Course Title</label>
                  <input className="form-input" required value={formData.title || ''} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="e.g. Advanced Artificial Intelligence" />
                </div>
                <div className="form-group mt-3">
                  <label>Course Code (e.g. CS-905)</label>
                  <input className="form-input" required value={formData.code || ''} onChange={(e) => setFormData({ ...formData, code: e.target.value })} placeholder="CS-905" />
                </div>
                <div className="form-group mt-3">
                  <label>Course Fee ({currency})</label>
                  <input
                    type="number"
                    step="1"
                    className="form-input"
                    value={formData.price || ''}
                    onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                    placeholder={currency === 'PKR' ? '45000' : '199.99'}
                  />
                  <div style={{ fontSize: '0.75rem', color: '#10b981', marginTop: '0.35rem' }}>
                    {formData.price ? (
                      currency === 'PKR'
                        ? `Equivalent: ≈ $${(formData.price / PKR_RATE).toFixed(2)} USD`
                        : `Equivalent: ≈ PKR ${Math.round(formData.price * PKR_RATE).toLocaleString()} PKR`
                    ) : (
                      `Default: ${currency === 'PKR' ? 'PKR 45,000 (≈ $160 USD)' : '$199.99 (≈ PKR 56,000)'}`
                    )}
                  </div>
                </div>
                <div className="form-group mt-3">
                  <label>Subject Discipline</label>
                  <input className="form-input" value={formData.subject || ''} onChange={(e) => setFormData({ ...formData, subject: e.target.value })} placeholder="Computer Science, Physics, etc." />
                </div>
                <div className="form-group mt-3">
                  <label>Course Description</label>
                  <textarea className="form-input" rows="3" value={formData.description || ''} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Detailed course overview and learning objectives..."></textarea>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setModalType(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create Course</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 5: REQUEST DELETION
          ======================================================== */}
      {modalType === 'request-deletion' && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <h2><i className="fa-solid fa-trash-can text-amber"></i> Request Entity Deletion</h2>
              <button className="close-btn" onClick={() => setModalType(null)}>&times;</button>
            </div>
            <form onSubmit={handleRequestDeletionSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Entity Type</label>
                  <input className="form-input" readOnly value={formData.entity_type || ''} />
                </div>
                <div className="form-group mt-3">
                  <label>Entity ID</label>
                  <input className="form-input font-mono" readOnly value={formData.entity_id || ''} />
                </div>
                <div className="form-group mt-3">
                  <label>Reason for Deletion</label>
                  <textarea className="form-input" required rows="3" value={formData.request_reason || ''} onChange={(e) => setFormData({ ...formData, request_reason: e.target.value })} placeholder="Explain why this record should be soft deleted..."></textarea>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setModalType(null)}>Cancel</button>
                <button type="submit" className="btn btn-danger">Submit Request</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 6: BROADCAST ANNOUNCEMENT
          ======================================================== */}
      {modalType === 'create-announcement' && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <h2><i className="fa-solid fa-bullhorn text-amber"></i> Broadcast Announcement</h2>
              <button className="close-btn" onClick={() => setModalType(null)}>&times;</button>
            </div>
            <form onSubmit={handleCreateAnnouncementSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Announcement Headline</label>
                  <input
                    className="form-input"
                    required
                    value={formData.ann_title || ''}
                    onChange={(e) => setFormData({ ...formData, ann_title: e.target.value })}
                    placeholder="e.g. Scheduled Governance Audit & Maintenance"
                  />
                </div>
                <div className="form-group mt-3">
                  <label>Audience Target</label>
                  <select
                    className="form-input"
                    value={formData.ann_target || 'ALL'}
                    onChange={(e) => setFormData({ ...formData, ann_target: e.target.value })}
                  >
                    <option value="ALL">All Platform Members</option>
                    <option value="TEACHERS">Faculty & Instructors Only</option>
                    <option value="STUDENTS">Students & Learners Only</option>
                    <option value="ADMINS">Administrators Only</option>
                  </select>
                </div>
                <div className="form-group mt-3">
                  <label>Announcement Message</label>
                  <textarea
                    className="form-input"
                    required
                    rows="4"
                    value={formData.ann_content || ''}
                    onChange={(e) => setFormData({ ...formData, ann_content: e.target.value })}
                    placeholder="Enter broadcast message text..."
                  ></textarea>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setModalType(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary"><i className="fa-solid fa-paper-plane"></i> Publish Broadcast</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const rootElement = document.getElementById("root");
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(<App />);
}

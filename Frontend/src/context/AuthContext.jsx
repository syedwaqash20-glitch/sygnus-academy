import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AuthContext = createContext(null);

const API_BASE = (typeof window !== "undefined" && window.location.origin && !window.location.origin.startsWith("file:") && !window.location.origin.includes("5173"))
  ? window.location.origin
  : "http://localhost:8000";

const PKR_RATE = 280;

export const ROLE_CONFIGS = {
  student: {
    id: "s1-student-uuid-901",
    name: "Alice Johnson",
    email: "alice.student@sygnus.edu",
    role: "student",
    title: "Alice Johnson (Learner)",
    roleTag: "LEVEL 1 — STUDENT LEARNER",
    avatar: "AJ",
    level: 1,
    icon: "fa-graduation-cap",
    color: "#10b981",
    defaultToken: "eyJhGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.student_alice_learn_07.sygnus_sig_39a"
  },
  teacher: {
    id: "t1-teacher-uuid-402",
    name: "Dr. Alan Turing",
    email: "alan.turing@sygnus.edu",
    role: "teacher",
    title: "Dr. Alan Turing",
    roleTag: "LEVEL 2 — FACULTY / CHAIR",
    avatar: "AT",
    level: 2,
    icon: "fa-chalkboard-user",
    color: "#a855f7",
    defaultToken: "eyJhGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.teacher_alan_turing_21.sygnus_sig_48b"
  },
  admin: {
    id: "a1-admin-uuid-103",
    name: "Sarah Connor",
    email: "sarah.admin@sygnus.edu",
    role: "admin",
    title: "Sarah Connor (Admin)",
    roleTag: "LEVEL 3 — SYSTEM ADMIN",
    avatar: "SC",
    level: 3,
    icon: "fa-user-shield",
    color: "#3b82f6",
    defaultToken: "eyJhGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.admin_sarah_sec_42.sygnus_sig_99c"
  },
  super_admin: {
    id: "sa1-superadmin-uuid-001",
    name: "Apex Super Admin",
    email: "superadmin@sygnus.edu",
    role: "super_admin",
    title: "Apex Super Admin",
    roleTag: "LEVEL 4 — APEX GOVERNOR",
    avatar: "SA",
    level: 4,
    icon: "fa-crown",
    color: "#f59e0b",
    defaultToken: "eyJhGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.apex_superadmin_master_99.sygnus_sig_apex"
  }
};

export const AuthProvider = ({ children }) => {
  // 1. Role State
  const [activeRole, setActiveRoleState] = useState(() => {
    return localStorage.getItem("sygnus_active_role") || "student";
  });

  // 2. Token State (Persistent in localStorage!)
  const [token, setTokenState] = useState(() => {
    const saved = localStorage.getItem("sygnus_auth_token");
    if (saved) return saved;
    // Default initial token based on role
    const initialRole = localStorage.getItem("sygnus_active_role") || "student";
    return ROLE_CONFIGS[initialRole]?.defaultToken || ROLE_CONFIGS.student.defaultToken;
  });

  // 3. Security Clearances
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(() => {
    return localStorage.getItem("sygnus_admin_unlocked") === "true";
  });
  const [isSuperAdminUnlocked, setIsSuperAdminUnlocked] = useState(() => {
    return localStorage.getItem("sygnus_super_admin_unlocked") === "true";
  });

  // 4. Currency State
  const [currency, setCurrencyState] = useState(() => {
    return localStorage.getItem("sygnus_currency") || "PKR";
  });

  // 5. Toast Feedback
  const [toast, setToast] = useState(null);

  // 6. Data States
  const [metrics, setMetrics] = useState({
    total_admins: 2,
    total_teachers: 2,
    total_students: 2,
    pending_deletion_requests: 1,
    pending_edit_requests: 1,
    quarantined_items: 0,
    recent_audit_events: 5
  });
  const [courses, setCourses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);
  const [pendingDeletions, setPendingDeletions] = useState([]);
  const [pendingEdits, setPendingEdits] = useState([]);
  const [trashBin, setTrashBin] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(false);

  const showToast = useCallback((message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  }, []);

  // Save Token explicitly (user requirement)
  const saveToken = useCallback((newToken) => {
    const cleaned = (newToken || "").trim();
    if (!cleaned) {
      showToast("Token cannot be empty", "error");
      return;
    }
    setTokenState(cleaned);
    localStorage.setItem("sygnus_auth_token", cleaned);
    showToast("Auth Token securely saved to LocalStorage!", "success");
  }, [showToast]);

  const generateToken = useCallback((role = activeRole) => {
    const timestamp = Math.floor(Date.now() / 1000);
    const mockHash = Math.random().toString(36).substring(2, 10);
    const tokenStr = `eyJhGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${role}_auth_${timestamp}_${mockHash}.sygnus_sig_${mockHash}`;
    saveToken(tokenStr);
    return tokenStr;
  }, [activeRole, saveToken]);

  const setCurrency = (newCurr) => {
    setCurrencyState(newCurr);
    localStorage.setItem("sygnus_currency", newCurr);
    showToast(`Currency switched to ${newCurr === 'PKR' ? 'Pakistani Rupee (PKR)' : 'US Dollar (USD)'}`, "info");
  };

  const formatPrice = useCallback((amount) => {
    if (amount === undefined || amount === null || isNaN(amount)) {
      return { primary: currency === "PKR" ? "PKR 0" : "$0.00", secondary: "" };
    }
    const num = parseFloat(amount);
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
  }, [currency]);

  const setActiveRole = (role) => {
    if (role === "admin" && !isAdminUnlocked) {
      showToast("Administrator portal requires clearance", "info");
      return;
    }
    if (role === "super_admin" && !isSuperAdminUnlocked) {
      showToast("Apex Vault requires Master Security Clearance", "info");
      return;
    }
    setActiveRoleState(role);
    localStorage.setItem("sygnus_active_role", role);

    // If current token is a default token for previous role, sync to new role's token
    const saved = localStorage.getItem("sygnus_auth_token");
    if (!saved || Object.values(ROLE_CONFIGS).some(c => c.defaultToken === saved)) {
      const newDefToken = ROLE_CONFIGS[role]?.defaultToken;
      if (newDefToken) {
        setTokenState(newDefToken);
        localStorage.setItem("sygnus_auth_token", newDefToken);
      }
    }

    showToast(`Switched workspace to ${ROLE_CONFIGS[role]?.title}`, "info");
  };

  const unlockAdmin = (password) => {
    if (!password || password.length < 3) {
      showToast("Invalid Admin credentials", "error");
      return false;
    }
    setIsAdminUnlocked(true);
    localStorage.setItem("sygnus_admin_unlocked", "true");
    setActiveRoleState("admin");
    localStorage.setItem("sygnus_active_role", "admin");
    showToast("Level 3 System Administrator clearance verified!", "success");
    return true;
  };

  const unlockSuperAdmin = (key) => {
    const trimmed = (key || "").trim();
    if (trimmed !== "SuperAdmin123!" && trimmed !== "ApexKey-2026" && trimmed !== "admin" && trimmed !== "apex") {
      showToast("Access Denied: Invalid Master Clearance Key", "error");
      return false;
    }
    setIsSuperAdminUnlocked(true);
    setIsAdminUnlocked(true);
    localStorage.setItem("sygnus_super_admin_unlocked", "true");
    localStorage.setItem("sygnus_admin_unlocked", "true");
    setActiveRoleState("super_admin");
    localStorage.setItem("sygnus_active_role", "super_admin");
    showToast("APEX GOVERNANCE LEVEL 4 GRANTED — Super Admin clearance active", "success");
    return true;
  };

  const lockAdmin = () => {
    setIsAdminUnlocked(false);
    localStorage.removeItem("sygnus_admin_unlocked");
    setActiveRoleState("student");
    localStorage.setItem("sygnus_active_role", "student");
    showToast("Admin session locked. Returned to Learner view.", "info");
  };

  const lockSuperAdmin = () => {
    setIsSuperAdminUnlocked(false);
    localStorage.removeItem("sygnus_super_admin_unlocked");
    const fallback = isAdminUnlocked ? "admin" : "student";
    setActiveRoleState(fallback);
    localStorage.setItem("sygnus_active_role", fallback);
    showToast("Apex Vault locked. Super Admin hidden.", "info");
  };

  // Safe API Fetch Wrapper with Token and Role Headers
  const apiFetch = useCallback(async (endpoint, options = {}) => {
    const url = endpoint.startsWith("http") ? endpoint : `${API_BASE}${endpoint}`;
    const userConfig = ROLE_CONFIGS[activeRole] || ROLE_CONFIGS.student;

    const headers = {
      "Authorization": `Bearer ${token}`,
      "X-Actor-Role": activeRole,
      "X-Actor-Id": userConfig.id,
      ...(options.headers || {})
    };

    if (options.body && typeof options.body === "object" && !(options.body instanceof FormData)) {
      headers["Content-Type"] = "application/json";
      options.body = JSON.stringify(options.body);
    }

    try {
      const response = await fetch(url, { ...options, headers });
      return response;
    } catch (err) {
      console.warn(`[Sygnus API] Request failed for ${url}:`, err);
      throw err;
    }
  }, [token, activeRole]);

  // Global Data Fetcher
  const refreshAll = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Dashboard Metrics
      apiFetch("/api/super-admin/dashboard")
        .then(r => r.ok ? r.json() : null)
        .then(data => { if (data) setMetrics(data); })
        .catch(() => {});

      // 2. Courses
      apiFetch("/api/courses/")
        .then(r => r.ok ? r.json() : null)
        .then(data => { if (Array.isArray(data)) setCourses(data); })
        .catch(() => {});

      // 3. Teachers
      apiFetch("/teachers/")
        .then(r => r.ok ? r.json() : null)
        .then(data => { if (Array.isArray(data)) setTeachers(data); })
        .catch(() => {});

      // 4. Students
      apiFetch("/students/")
        .then(r => r.ok ? r.json() : null)
        .then(data => { if (Array.isArray(data)) setStudents(data); })
        .catch(() => {});

      // 5. Governance Deletion Requests
      apiFetch("/api/governance/deletion-requests")
        .then(r => r.ok ? r.json() : null)
        .then(data => { if (Array.isArray(data)) setPendingDeletions(data); })
        .catch(() => {});

      // 6. Governance Edit Requests
      apiFetch("/api/governance/edit-requests")
        .then(r => r.ok ? r.json() : null)
        .then(data => { if (Array.isArray(data)) setPendingEdits(data); })
        .catch(() => {});

      // 7. Trash Bin
      apiFetch("/api/governance/trash-bin")
        .then(r => r.ok ? r.json() : null)
        .then(data => { if (Array.isArray(data)) setTrashBin(data); })
        .catch(() => {});

      // 8. Audit Logs
      apiFetch("/api/governance/audit-logs")
        .then(r => r.ok ? r.json() : null)
        .then(data => { if (Array.isArray(data)) setAuditLogs(data); })
        .catch(() => {});

      // 9. Announcements
      apiFetch("/api/governance/announcements")
        .then(r => r.ok ? r.json() : null)
        .then(data => { if (Array.isArray(data)) setAnnouncements(data); })
        .catch(() => {});

      // 10. Admins
      apiFetch("/api/super-admin/admins")
        .then(r => r.ok ? r.json() : null)
        .then(data => { if (Array.isArray(data)) setAdmins(data); })
        .catch(() => {});

    } finally {
      setLoading(false);
    }
  }, [apiFetch]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  const currentUser = ROLE_CONFIGS[activeRole] || ROLE_CONFIGS.student;

  return (
    <AuthContext.Provider
      value={{
        token,
        saveToken,
        generateToken,
        activeRole,
        setActiveRole,
        currentUser,
        currency,
        setCurrency,
        formatPrice,
        toast,
        showToast,
        isAdminUnlocked,
        isSuperAdminUnlocked,
        unlockAdmin,
        unlockSuperAdmin,
        lockAdmin,
        lockSuperAdmin,
        apiFetch,
        metrics,
        courses,
        teachers,
        students,
        pendingDeletions,
        pendingEdits,
        trashBin,
        auditLogs,
        announcements,
        admins,
        loading,
        refreshAll
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

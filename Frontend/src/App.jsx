import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Header } from './components/Header';
import { StudentPortal } from './components/StudentPortal';
import { TeacherPortal } from './components/TeacherPortal';
import { AdminPortal } from './components/AdminPortal';
import { SuperAdminPortal } from './components/SuperAdminPortal';
import { TokenModal } from './components/TokenModal';

const MainPortalRouter = () => {
  const { activeRole, toast } = useAuth();
  const [tokenModalOpen, setTokenModalOpen] = useState(false);

  return (
    <div className="app-container">
      {/* Dynamic Header */}
      <Header onOpenTokenModal={() => setTokenModalOpen(true)} />

      {/* Role-Specific Portal Views */}
      {activeRole === 'student' && (
        <StudentPortal onOpenTokenModal={() => setTokenModalOpen(true)} />
      )}

      {activeRole === 'teacher' && (
        <TeacherPortal onOpenTokenModal={() => setTokenModalOpen(true)} />
      )}

      {activeRole === 'admin' && (
        <AdminPortal onOpenTokenModal={() => setTokenModalOpen(true)} />
      )}

      {activeRole === 'super_admin' && (
        <SuperAdminPortal onOpenTokenModal={() => setTokenModalOpen(true)} />
      )}

      {/* Persistent Token Vault Modal (Save My Token) */}
      <TokenModal
        isOpen={tokenModalOpen}
        onClose={() => setTokenModalOpen(false)}
      />

      {/* Toast Notification Container */}
      {toast && (
        <div className="toast-container">
          <div className={`toast-msg toast-${toast.type}`}>
            <i className={`fa-solid ${
              toast.type === 'success' ? 'fa-circle-check text-emerald' :
              toast.type === 'error' ? 'fa-circle-xmark text-red' :
              'fa-circle-info text-blue'
            }`}></i>
            <span>{toast.message}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainPortalRouter />
    </AuthProvider>
  );
}

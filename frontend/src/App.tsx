// src/App.tsx
// 統合版 App.tsx（AuthContext + InternalRoute対応）

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';

import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import RegisterCompletePage from './pages/RegisterCompletePage';
import DashboardPage from './pages/DashboardPage';
import MyProfilePage from './pages/MyProfilePage';
import InvoiceListPage from './pages/InvoiceListPage';
import InvoiceCreatePage from './pages/InvoiceCreatePage';
import InvoiceDetailPage from './pages/InvoiceDetailPage';
import InvoicePeriods from './pages/InvoicePeriods';
import MyPendingApprovalsPage from './pages/MyPendingApprovalsPage';
import InvoiceCorrectionReviewPage from './pages/InvoiceCorrectionReviewPage';
import InvoiceEditWithCorrectionPage from './pages/InvoiceEditWithCorrectionPage';
import RegistrationRequestsPage from './pages/admin/RegistrationRequestsPage';
import PasswordResetRequestPage from './pages/PasswordResetRequestPage';
import PasswordResetConfirmPage from './pages/PasswordResetConfirmPage';
import PaymentCalendar from './components/PaymentCalendar';
import CalendarManagementPage from './pages/admin/CalendarManagementPage';
import SiteManagementPage from './pages/admin/SiteManagementPage';
import UserManagementPage from './pages/admin/UserManagementPage';
import PartnerCompanyManagementPage from './pages/admin/PartnerCompanyManagementPage';
import AuditLogPage from './pages/AuditLogPage';

// ====================
// 認証保護ルート
// ====================
const ProtectedRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

// ====================
// 内部ユーザー専用ルート
// ====================
const InternalRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.user_type !== 'internal') {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

// ====================
// 未ログインユーザー専用ルート
// ====================
const PublicRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
      </div>
    );
  }

  return !isAuthenticated ? children : <Navigate to="/dashboard" replace />;
};

// ====================
// ルーティング定義
// ====================
const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* 公開ルート */}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        }
      />
      <Route
        path="/register"
        element={
          <PublicRoute>
            <RegisterPage />
          </PublicRoute>
        }
      />
      <Route
        path="/register-complete"
        element={
          <PublicRoute>
            <RegisterCompletePage />
          </PublicRoute>
        }
      />
      <Route
        path="/forgot-password"
        element={
          <PublicRoute>
            <PasswordResetRequestPage />
          </PublicRoute>
        }
      />
      <Route
        path="/reset-password/:uid/:token"
        element={
          <PublicRoute>
            <PasswordResetConfirmPage />
          </PublicRoute>
        }
      />

      {/* 保護ルート */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/my-profile"
        element={
          <ProtectedRoute>
            <MyProfilePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/invoices"
        element={
          <ProtectedRoute>
            <InvoiceListPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/invoices/create"
        element={
          <ProtectedRoute>
            <InvoiceCreatePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/invoices/:id"
        element={
          <ProtectedRoute>
            <InvoiceDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/invoices/:id/correction-review"
        element={
          <ProtectedRoute>
            <InvoiceCorrectionReviewPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/invoices/:id/edit-correction"
        element={
          <InternalRoute>
            <InvoiceEditWithCorrectionPage />
          </InternalRoute>
        }
      />

      {/* 内部ユーザー専用 */}
      <Route
        path="/invoice-periods"
        element={
          <InternalRoute>
            <InvoicePeriods />
          </InternalRoute>
        }
      />
      <Route
        path="/my-approvals"
        element={
          <InternalRoute>
            <MyPendingApprovalsPage />
          </InternalRoute>
        }
      />
      <Route
        path="/admin/registration-requests"
        element={
          <InternalRoute>
            <RegistrationRequestsPage />
          </InternalRoute>
        }
      />
      <Route
        path="/payment-calendar"
        element={
          <ProtectedRoute>
            <PaymentCalendar />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/calendar-management"
        element={
          <InternalRoute>
            <CalendarManagementPage />
          </InternalRoute>
        }
      />
      <Route
        path="/admin/sites"
        element={
          <InternalRoute>
            <SiteManagementPage />
          </InternalRoute>
        }
      />
      <Route
        path="/admin/users"
        element={
          <InternalRoute>
            <UserManagementPage />
          </InternalRoute>
        }
      />
      <Route
        path="/admin/partners"
        element={
          <InternalRoute>
            <PartnerCompanyManagementPage />
          </InternalRoute>
        }
      />
      <Route
        path="/audit-logs"
        element={
          <InternalRoute>
            <AuditLogPage />
          </InternalRoute>
        }
      />

      {/* デフォルトルート */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      {/* 404 */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes >
  );
};

// ====================
// メインApp
// ====================
const App: React.FC = () => {
  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Router>
  );
};

export default App;

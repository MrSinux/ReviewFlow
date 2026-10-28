
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import PublicReviewPage from './pages/public/PublicReviewPage';
import FeedbackFormPage from './pages/public/FeedbackFormPage';
import ThankYouPage from './pages/public/ThankYouPage';
import DemoGoogleReviewPage from './pages/public/DemoGoogleReviewPage';
import DemoOutboxPage from './pages/public/DemoOutboxPage';
import SuperDashboard from './pages/super/SuperDashboard';
import LoginPage from './pages/LoginPage';
import BusinessAdminDashboard from './pages/admin/BusinessAdminDashboard';
import BusinessAdminFeedback from './pages/admin/BusinessAdminFeedback';
import BusinessAdminSettings from './pages/admin/BusinessAdminSettings';
import BusinessAdminLinks from './pages/admin/BusinessAdminLinks';
import AdminLayout from './components/layouts/AdminLayout';
import ProtectedRoute from './components/auth/ProtectedRoute';

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Customer Routes */}
        <Route path="/r/:slug" element={<PublicReviewPage />} />
        <Route path="/r/:slug/feedback" element={<FeedbackFormPage />} />
        <Route path="/r/:slug/thanks" element={<ThankYouPage />} />
        <Route path="/demo/google-review" element={<DemoGoogleReviewPage />} />
        <Route path="/demo/outbox" element={<DemoOutboxPage />} />
        
        {/* Unified Login */}
        <Route path="/login" element={<LoginPage />} />
        {/* Legacy login redirects */}
        <Route path="/super/login" element={<Navigate to="/login" replace />} />
        <Route path="/p/:slug/login" element={<Navigate to="/login" replace />} />

        {/* Super Admin Routes */}
        <Route path="/super" element={
          <ProtectedRoute allow={['super']}>
            <SuperDashboard />
          </ProtectedRoute>
        } />

        {/* Business Admin Routes */}
        <Route path="/p/:slug/admin" element={
          <ProtectedRoute allow={['super','admin']}>
            <AdminLayout>
              <BusinessAdminDashboard />
            </AdminLayout>
          </ProtectedRoute>
        } />
        <Route path="/p/:slug/admin/feedback" element={
          <ProtectedRoute allow={['super','admin']}>
            <AdminLayout>
              <BusinessAdminFeedback />
            </AdminLayout>
          </ProtectedRoute>
        } />
        <Route path="/p/:slug/admin/settings" element={
          <ProtectedRoute allow={['super','admin']}>
            <AdminLayout>
              <BusinessAdminSettings />
            </AdminLayout>
          </ProtectedRoute>
        } />

        <Route path="/p/:slug/admin/links" element={
          <ProtectedRoute allow={['super','admin']}>
            <AdminLayout>
              <BusinessAdminLinks />
            </AdminLayout>
          </ProtectedRoute>
        } />

        <Route path="/" element={<Navigate to="/super" />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;

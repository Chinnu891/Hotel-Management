import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { RealTimeProvider } from './contexts/RealTimeContext';
import Login from './components/Login';
import AdminDashboard from './components/admin/AdminDashboard';
import ReceptionDashboard from './components/reception/ReceptionDashboard';
import NewBooking from './components/booking/NewBooking';
import ProtectedRoute from './components/ProtectedRoute';
import InvoiceRedirect from './components/reception/InvoiceRedirect';

function App() {
  return (
    <AuthProvider>
      <RealTimeProvider>
        <Router
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true
          }}
        >
          <div className="App">
            <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/admin/reception/*" element={
              <ProtectedRoute role="admin">
                <ReceptionDashboard />
              </ProtectedRoute>
            } />
            <Route path="/admin/new-booking" element={
              <ProtectedRoute role="admin">
                <AdminDashboard />
              </ProtectedRoute>
            } />
            <Route path="/admin/new-booking/:guestId" element={
              <ProtectedRoute role="admin">
                <AdminDashboard />
              </ProtectedRoute>
            } />
            <Route path="/admin/room-availability" element={
              <ProtectedRoute role="admin">
                <AdminDashboard />
              </ProtectedRoute>
            } />
            <Route path="/admin/room-availability/:checkIn/:checkOut/:guests" element={
              <ProtectedRoute role="admin">
                <AdminDashboard />
              </ProtectedRoute>
            } />
            <Route path="/admin/pricing-calculator" element={
              <ProtectedRoute role="admin">
                <AdminDashboard />
              </ProtectedRoute>
            } />
            <Route path="/admin/pricing-calculator/:roomTypeId/:checkIn/:checkOut/:guests" element={
              <ProtectedRoute role="admin">
                <AdminDashboard />
              </ProtectedRoute>
            } />
            <Route path="/admin/booking-confirmation/:bookingId" element={
              <ProtectedRoute role="admin">
                <AdminDashboard />
              </ProtectedRoute>
            } />
            <Route path="/admin/booking-confirmation/:bookingId/:action" element={
              <ProtectedRoute role="admin">
                <AdminDashboard />
              </ProtectedRoute>
            } />
            <Route path="/admin/billing/*" element={
              <ProtectedRoute role="admin">
                <AdminDashboard />
              </ProtectedRoute>
            } />
            <Route path="/admin/email-management/*" element={
              <ProtectedRoute role="admin">
                <AdminDashboard />
              </ProtectedRoute>
            } />
            <Route path="/admin/guest-search" element={
              <ProtectedRoute role="admin">
                <AdminDashboard />
              </ProtectedRoute>
            } />
            <Route path="/admin/maintenance" element={
              <ProtectedRoute role="admin">
                <AdminDashboard />
              </ProtectedRoute>
            } />
            <Route path="/admin/maintenance-reports" element={
              <ProtectedRoute role="admin">
                <AdminDashboard />
              </ProtectedRoute>
            } />
            <Route path="/admin/maintenance-status" element={
              <ProtectedRoute role="admin">
                <AdminDashboard />
              </ProtectedRoute>
            } />
            <Route path="/admin/housekeeping" element={
              <ProtectedRoute role="admin">
                <AdminDashboard />
              </ProtectedRoute>
            } />
            <Route path="/admin/reports" element={
              <ProtectedRoute role="admin">
                <AdminDashboard />
              </ProtectedRoute>
            } />

            <Route path="/admin/rooms" element={
              <ProtectedRoute role="admin">
                <AdminDashboard />
              </ProtectedRoute>
            } />
            <Route path="/admin/staff" element={
              <ProtectedRoute role="admin">
                <AdminDashboard />
              </ProtectedRoute>
            } />
            <Route path="/admin/guest-history" element={
              <ProtectedRoute role="admin">
                <AdminDashboard />
              </ProtectedRoute>
            } />
            <Route path="/admin/booking/*" element={
              <ProtectedRoute role="admin">
                <AdminDashboard />
              </ProtectedRoute>
            } />
            <Route path="/admin/*" element={
              <ProtectedRoute role="admin">
                <AdminDashboard />
              </ProtectedRoute>
            } />
            <Route path="/reception/*" element={
              <ProtectedRoute role="reception">
                <ReceptionDashboard />
              </ProtectedRoute>
            } />
            <Route path="/booking/*" element={
              <ProtectedRoute role="reception">
                <ReceptionDashboard />
              </ProtectedRoute>
            } />
            <Route path="/booking-confirmation/:bookingId" element={
              <ProtectedRoute role="reception">
                <ReceptionDashboard />
              </ProtectedRoute>
            } />
            <Route path="/booking-confirmation/:bookingId/:action" element={
              <ProtectedRoute role="reception">
                <ReceptionDashboard />
              </ProtectedRoute>
            } />
            <Route path="/pricing-calculator" element={
              <ProtectedRoute role="reception">
                <ReceptionDashboard />
              </ProtectedRoute>
            } />
            <Route path="/pricing-calculator/:roomTypeId/:checkIn/:checkOut/:guests" element={
              <ProtectedRoute role="reception">
                <ReceptionDashboard />
              </ProtectedRoute>
            } />
            <Route path="/room-availability" element={
              <ProtectedRoute role="reception">
                <ReceptionDashboard />
              </ProtectedRoute>
            } />
            <Route path="/room-availability/:checkIn/:checkOut/:guests" element={
              <ProtectedRoute role="reception">
                <ReceptionDashboard />
              </ProtectedRoute>
            } />
            <Route path="/new-booking" element={
              <ProtectedRoute role="reception">
                <NewBooking key="new-booking-v4" />
              </ProtectedRoute>
            } />
            <Route path="/new-booking/:guestId" element={
              <ProtectedRoute role="reception">
                <NewBooking key="new-booking-v4" />
              </ProtectedRoute>
            } />
            <Route path="/create-booking" element={
              <ProtectedRoute role="reception">
                <NewBooking key="create-booking-v2" />
              </ProtectedRoute>
            } />
            <Route path="/booking-create" element={
              <ProtectedRoute role="reception">
                <NewBooking key="booking-create-v1" />
              </ProtectedRoute>
            } />
            <Route path="/billing/*" element={
              <ProtectedRoute role="reception">
                <ReceptionDashboard />
              </ProtectedRoute>
            } />
            <Route path="/email-management/*" element={
              <ProtectedRoute role="reception">
                <ReceptionDashboard />
              </ProtectedRoute>
            } />
            <Route path="/maintenance" element={
              <ProtectedRoute role="reception">
                <ReceptionDashboard />
              </ProtectedRoute>
            } />
            <Route path="/housekeeping" element={
              <ProtectedRoute role="reception">
                <ReceptionDashboard />
              </ProtectedRoute>
            } />
            <Route path="/invoice" element={<InvoiceRedirect />} />
            <Route path="/manage-invoices" element={<InvoiceRedirect />} />
            <Route path="/payment" element={<InvoiceRedirect />} />
            <Route path="/history" element={<InvoiceRedirect />} />
            <Route path="/stats" element={<InvoiceRedirect />} />
            <Route path="/" element={<Navigate to="/login" replace />} />
          </Routes>
        </div>
        </Router>
      </RealTimeProvider>
    </AuthProvider>
  );
}

export default App;

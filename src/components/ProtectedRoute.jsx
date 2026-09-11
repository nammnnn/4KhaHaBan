import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const ProtectedRoute = ({ requiredRole }) => {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ minHeight: '100dvh', padding: '24px 16px', backgroundColor: 'var(--background, #FAF8F5)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ width: '100%', maxWidth: '480px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="skeleton skeleton-text" style={{ width: '40%', height: '24px', margin: '0 auto' }} />
          <div className="skeleton skeleton-card" style={{ height: '260px' }} />
        </div>
      </div>
    );
  }

  // ถ้าไม่ได้ล็อกอิน ให้เด้งไปหน้า Login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // ถ้าต้องการสิทธิ์พิเศษ (เช่น admin) แต่ผู้ใช้ไม่ใช่ admin
  if (requiredRole && role !== requiredRole) {
    return <Navigate to="/" replace />;
  }

  // หมายเหตุ: การเช็ค foundation redirect ย้ายไปจัดการที่ RoleEnforcer ใน App.jsx แล้ว
  // เพื่อไม่ให้ duplicate logic

  // อนุญาตให้ผ่านไปได้
  return <Outlet />;
};

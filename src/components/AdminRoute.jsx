import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const AdminRoute = () => {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ minHeight: '100dvh', padding: '24px 16px', backgroundColor: 'var(--background, #FAF8F5)' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <div style={{ marginBottom: '24px' }}>
            <div className="skeleton skeleton-text" style={{ width: '240px', height: '28px', marginBottom: '8px' }} />
            <div className="skeleton skeleton-text" style={{ width: '340px', height: '16px' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            {[1, 2, 3].map(i => (
              <div key={i} className="skeleton skeleton-card" style={{ height: '110px' }} />
            ))}
          </div>
          <div className="skeleton skeleton-card" style={{ height: '380px' }} />
        </div>
      </div>
    );
  }

  // ถ้าไม่ได้ล็อกอิน หรือสิทธิ์ไม่ใช่ super_admin ให้เด้งไปหน้าแรก
  if (!user || role !== 'super_admin') {
    return <Navigate to="/" replace />;
  }

  // อนุญาตให้ผ่านไปหน้า Admin ได้
  return <Outlet />;
};

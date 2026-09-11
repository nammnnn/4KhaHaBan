import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Loader, AlertCircle } from 'lucide-react';
import { AppProvider } from './context/AppContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navigation } from './components/Navigation';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AdminRoute } from './components/AdminRoute';

// Error Boundary to prevent blank white screens
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', textAlign: 'center' }}>
          <div style={{ maxWidth: '420px', background: 'white', padding: '28px', borderRadius: '16px', boxShadow: '0 10px 25px rgba(0,0,0,0.06)', border: '1px solid #E5E7EB' }}>
            <div style={{ width: '52px', height: '52px', borderRadius: '50%', backgroundColor: '#FEE2E2', color: '#DC2626', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <AlertCircle size={26} />
            </div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#111827', margin: '0 0 8px' }}>เกิดข้อผิดพลาดในการแสดงผล</h2>
            <p style={{ fontSize: '0.875rem', color: '#6B7280', margin: '0 0 20px', lineHeight: 1.5 }}>
              ระบบพบปัญหาชั่วคราวในการโหลดข้อมูล กรุณาลองรีเฟรชหน้าจอใหม่อีกครั้ง
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                onClick={() => window.location.reload()}
                style={{ flex: 1, padding: '10px 16px', backgroundColor: 'var(--primary, #D97706)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
              >
                โหลดหน้านี้ใหม่
              </button>
              <button 
                onClick={() => window.location.href = '/'}
                style={{ flex: 1, padding: '10px 16px', backgroundColor: '#F3F4F6', color: '#374151', border: '1px solid #D1D5DB', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
              >
                กลับหน้าหลัก
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// Lazy loaded routes for performance (Code Splitting)
const Feed = React.lazy(() => import('./pages/Feed'));
const MatchChat = React.lazy(() => import('./pages/MatchChat'));
const ChatRoom = React.lazy(() => import('./pages/ChatRoom'));
const UserProfile = React.lazy(() => import('./pages/UserProfile'));
const Donation = React.lazy(() => import('./pages/Donation'));
const AnimalProfile = React.lazy(() => import('./pages/AnimalProfile'));
const Login = React.lazy(() => import('./pages/Login'));
const AdminDashboard = React.lazy(() => import('./pages/AdminDashboard'));
const FoundationOnboarding = React.lazy(() => import('./pages/FoundationOnboarding'));
const FoundationPending = React.lazy(() => import('./pages/FoundationPending'));
const FoundationDashboard = React.lazy(() => import('./pages/FoundationDashboard'));
const FoundationAnimals = React.lazy(() => import('./pages/FoundationAnimals'));
const AnimalForm = React.lazy(() => import('./pages/AnimalForm'));
const SupportChat = React.lazy(() => import('./pages/SupportChat'));
const UserVerification = React.lazy(() => import('./pages/UserVerification'));
const FoundationMatchChat = React.lazy(() => import('./pages/FoundationMatchChat'));
const FoundationChatRoom = React.lazy(() => import('./pages/FoundationChatRoom'));
const FoundationIncidents = React.lazy(() => import('./pages/FoundationIncidents'));
const FoundationNeeds = React.lazy(() => import('./pages/FoundationNeeds'));
const AdoptionFollowup = React.lazy(() => import('./pages/AdoptionFollowup'));
const AdoptionTimeline = React.lazy(() => import('./pages/AdoptionTimeline'));

// Loading Fallback Component
const PageLoader = () => (
  <div style={{ height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
    <Loader className="spin" size={32} color="var(--primary)" />
  </div>
);

// RoleEnforcer: บังคับ redirect ตาม role + verification status
// - foundation ที่ยังไม่ approved → redirect ไป /foundation/pending
// - foundation ที่ approved แล้ว → ให้เข้าหน้าปกติได้
const RoleEnforcer = ({ children }) => {
  const { user, role, foundationStatus, loading } = useAuth();
  const location = useLocation();

  // ไม่ทำอะไรถ้ายังโหลดไม่เสร็จ หรือไม่ได้ล็อกอิน
  if (loading || !user) return children;

  // Foundation ที่ยังไม่ approved
  if (role === 'foundation' && foundationStatus !== 'approved') {
    const allowedPaths = ['/foundation/pending', '/foundation/onboarding', '/profile', '/login'];
    const isAllowed = allowedPaths.some(p => location.pathname.startsWith(p));

    if (!isAllowed) {
      return <Navigate to="/foundation/pending" replace />;
    }
  }

  // Foundation ที่ approved แล้ว (ไม่ให้เข้าหน้า Feed หลัก)
  if (role === 'foundation' && foundationStatus === 'approved') {
    // ห้ามเข้าหน้าเหล่านี้
    const blockedPaths = ['/matches', '/donation'];
    const isBlocked = blockedPaths.some(p => location.pathname.startsWith(p)) || location.pathname === '/';
    
    if (isBlocked) {
      return <Navigate to="/foundation" replace />;
    }
  }

  // Super Admin (ไม่ให้เข้าหน้าผู้ใช้ทั่วไป)
  if (role === 'super_admin') {
    const blockedPaths = ['/matches', '/donation'];
    const isBlocked = blockedPaths.some(p => location.pathname.startsWith(p)) || location.pathname === '/';
    
    if (isBlocked) {
      return <Navigate to="/admin" replace />;
    }
  }

  return children;
};

function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <BrowserRouter>
          <div className="app-container">
            <RoleEnforcer>
              <Navigation />
              <main className="main-content">
                <ErrorBoundary>
                  <Suspense fallback={<PageLoader />}>
                    <Routes>
                    {/* Public Routes */}
                    <Route path="/login" element={<Login />} />
                    
                    {/* Protected Routes */}
                    <Route element={<ProtectedRoute />}>
                      {/* Main App Routes */}
                      <Route path="/" element={<Feed />} />
                      <Route path="/animal/:id" element={<AnimalProfile />} />
                      
                      <Route path="/matches" element={<MatchChat />} />
                      <Route path="/chat/:matchId" element={<MatchChat />} />
                      <Route path="/donation" element={<Donation />} />
                      <Route path="/profile" element={<UserProfile />} />
                      <Route path="/verify-user" element={<UserVerification />} />
                      <Route path="/support-chat" element={<SupportChat />} />

                      {/* Foundation Routes (Pending/Onboarding) */}
                      <Route path="/foundation/onboarding" element={<FoundationOnboarding />} />
                      <Route path="/foundation/pending" element={<FoundationPending />} />
                      
                      {/* Foundation Routes (Approved) */}
                      <Route path="/foundation" element={<FoundationDashboard />} />
                      <Route path="/foundation/animals" element={<FoundationAnimals />} />
                      <Route path="/foundation/animals/new" element={<AnimalForm />} />
                      <Route path="/foundation/animals/:id/edit" element={<AnimalForm />} />
                      <Route path="/foundation/matches" element={<FoundationMatchChat />} />
                      <Route path="/foundation/chat/:matchId" element={<FoundationMatchChat />} />
                      <Route path="/foundation/incidents" element={<FoundationIncidents />} />
                      <Route path="/foundation/needs" element={<FoundationNeeds />} />

                      {/* Adoption Post-Care Follow-up Routes */}
                      <Route path="/adoption/followup/:matchId" element={<AdoptionFollowup />} />
                      <Route path="/adoption/timeline/:matchId" element={<AdoptionTimeline />} />
                      <Route path="/foundation/followup/:matchId" element={<AdoptionFollowup />} />
                      <Route path="/foundation/timeline/:matchId" element={<AdoptionTimeline />} />
                    </Route>

                    {/* Super Admin Routes */}
                    <Route element={<AdminRoute />}>
                      <Route path="/admin" element={<AdminDashboard />} />
                    </Route>
                    </Routes>
                  </Suspense>
                </ErrorBoundary>
              </main>
            </RoleEnforcer>
          </div>
        </BrowserRouter>
      </AppProvider>
    </AuthProvider>
  );
}

export default App;

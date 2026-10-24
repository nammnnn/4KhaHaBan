import React, { Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navigation } from './components/Navigation';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AdminRoute } from './components/AdminRoute';
import { ToastProvider } from './components/ui';
import { LanguageProvider } from './i18n';
import { ErrorBoundary, NotFound } from './components/ErrorScreens';

// Lazy loaded routes for performance (Code Splitting)
const Feed = React.lazy(() => import('./pages/Feed'));
const MatchChat = React.lazy(() => import('./pages/MatchChat'));
const ChatRoom = React.lazy(() => import('./pages/ChatRoom'));
const UserProfile = React.lazy(() => import('./pages/UserProfile'));
const Donation = React.lazy(() => import('./pages/Donation'));
const IncidentReport = React.lazy(() => import('./pages/IncidentReport'));
const AnimalProfile = React.lazy(() => import('./pages/AnimalProfile'));
const Login = React.lazy(() => import('./pages/Login'));
const ResetPassword = React.lazy(() => import('./pages/ResetPassword'));
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

import { RouteSkeleton } from './components/Skeletons';

// Route-Adaptive Skeleton Fallback (100% Skeleton Load, no spinner)
const PageLoader = () => <RouteSkeleton />;

// RoleEnforcer: บังคับ redirect ตาม role + verification status
// - foundation ที่ยังไม่ approved → redirect ไป /foundation/pending
// - foundation ที่ approved แล้ว → ให้เข้าหน้าปกติได้
const RoleEnforcer = ({ children }) => {
  const { user, role, foundationStatus, loading, passwordRecovery } = useAuth();
  const location = useLocation();

  // Opened a "reset password" link (Supabase may land it on the home page): finish that first
  if (passwordRecovery && location.pathname !== '/reset-password') {
    return <Navigate to="/reset-password" replace />;
  }

  // ไม่ทำอะไรถ้ายังโหลดไม่เสร็จ หรือไม่ได้ล็อกอิน
  if (loading || !user) return children;

  // Foundation ที่ยังไม่ approved
  if (role === 'foundation' && foundationStatus !== 'approved') {
    const allowedPaths = ['/foundation/pending', '/foundation/onboarding', '/profile', '/login', '/reset-password'];
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

// Fetch the main tabs' code once the app is idle, so the first tap on a tab opens it
// straight away instead of flashing its loading skeleton. Skipped on data-saver connections.
function preloadMainTabs() {
  if (navigator.connection?.saveData) return;
  const load = () => {
    import('./pages/Feed');
    import('./pages/MatchChat');
    import('./pages/ChatRoom');
    import('./pages/IncidentReport');
    import('./pages/Donation');
    import('./pages/UserProfile');
    import('./pages/AnimalProfile');
  };
  if ('requestIdleCallback' in window) window.requestIdleCallback(load, { timeout: 4000 });
  else setTimeout(load, 2000);
}

function App() {
  useEffect(() => { preloadMainTabs(); }, []);

  return (
    <LanguageProvider>
    <AuthProvider>
      <AppProvider>
      <ToastProvider>
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
                    <Route path="/reset-password" element={<ResetPassword />} />
                    
                    {/* Protected Routes */}
                    <Route element={<ProtectedRoute />}>
                      {/* Main App Routes */}
                      <Route path="/" element={<Feed />} />
                      <Route path="/animal/:id" element={<AnimalProfile />} />
                      
                      <Route path="/matches" element={<MatchChat />} />
                      <Route path="/chat/:matchId" element={<MatchChat />} />
                      <Route path="/report" element={<IncidentReport />} />
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

                      <Route path="*" element={<NotFound />} />
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
      </ToastProvider>
      </AppProvider>
    </AuthProvider>
    </LanguageProvider>
  );
}

export default App;

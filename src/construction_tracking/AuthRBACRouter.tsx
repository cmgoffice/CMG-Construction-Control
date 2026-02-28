import React, { useState, ReactNode, useRef, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation, useNavigate } from 'react-router-dom';
import { ShieldAlert, LogOut, Menu, UserCircle, Briefcase, FileText, BarChart3, Shield, User, Bell, BookOpen } from 'lucide-react';
import { UserManualModal } from './UserManual';
import { useNotifications, NotificationItem } from './useNotifications';

// Real Auth imports
import { AuthProvider as RealAuthProvider, useAuthContext, Role as RealRole } from './AuthContext';
import { AuthForm } from './AuthForm';
import { AdminDashboard } from './AdminDashboard';
import { Profile } from './Profile';

// App Components
import ProjectDashboard from './ProjectDashboard';
import SWOCreationForm from './SWOCreationForm';
import { DailyReportManager, ApprovalDashboard } from './DailyReportWorkflow';
import { SWOCloseWorkflow } from './ClosureWorkflows';
import ExecutiveDashboards from './ExecutiveDashboards';
import { collection, onSnapshot, query, doc, updateDoc } from 'firebase/firestore';
import { db, logActivity } from './firebase';

// Wrapper: reads location.state to auto-edit a specific SWO
const SWOCreationWrapper: React.FC = () => {
  const location = useLocation();
  const navTargetId = (location.state as any)?.targetId;
  const [editSwo, setEditSwo] = React.useState<any | null>(null);
  const [loaded, setLoaded] = React.useState(false);

  React.useEffect(() => {
    if (!navTargetId) { setLoaded(true); return; }
    const unsub = onSnapshot(query(collection(db, 'site_work_orders')), snap => {
      const found = snap.docs.map(d => ({ id: d.id, ...d.data() })).find(s => s.id === navTargetId);
      if (found) {
        setEditSwo(found);
        window.history.replaceState({}, '');
      }
      setLoaded(true);
    });
    return unsub;
  }, [navTargetId]);

  if (!loaded) return null;
  return <SWOCreationForm editSwo={editSwo || undefined} onCancelEdit={editSwo ? () => setEditSwo(null) : undefined} />;
};

// --- Bridge ---
export type Role = RealRole;

export const useAuth = () => {
  const context = useAuthContext();
  return {
    user: context.appUser ? {
      uid: context.appUser.uid,
      name: `${context.appUser.firstName} ${context.appUser.lastName}`,
      role: context.appUser.role,
      email: context.appUser.email,
      assigned_projects: context.appUser.assigned_projects || [],
    } : null,
    login: () => { }, // Cannot manually login like Mock anymore... handled via Form
    logout: context.logout
  };
};

export const AuthProvider = RealAuthProvider;

// --- Protected Route Wrapper ---
interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: Role[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-50">
        <ShieldAlert className="w-16 h-16 text-red-500 mb-4" />
        <h1 className="text-2xl font-bold text-gray-800">Access Denied</h1>
        <p className="text-gray-600 mt-2">You don't have permission to view this page.</p>
        <Link to="/dashboard" className="mt-6 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition">
          Return to Dashboard
        </Link>
      </div>
    );
  }

  return <>{children}</>;
};

// --- Closure Rejected notification card (Supervisor): shows SWO No, Work Name, Reject Role, Reason + 2 buttons ---
const ClosureRejectedNotificationCard: React.FC<{
  item: NotificationItem;
  onResubmit: () => void | Promise<void>;
  onCancel: () => void | Promise<void>;
  onGoToPage: () => void;
}> = ({ item, onResubmit, onCancel, onGoToPage }) => {
  const [loading, setLoading] = useState(false);
  const handleResubmit = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setLoading(true);
    try {
      await onResubmit();
    } finally {
      setLoading(false);
    }
  };
  const handleCancel = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setLoading(true);
    try {
      await onCancel();
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="px-4 py-3 bg-red-50/80 border-l-4 border-red-400 rounded-r-lg" onClick={e => e.stopPropagation()}>
      <div className="flex items-start gap-2 mb-2">
        <span className="mt-1 w-2.5 h-2.5 rounded-full shrink-0 animate-pulse bg-red-500" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-red-800 uppercase tracking-wide mb-1.5">คำขอปิด SWO ถูก Reject</p>
          <dl className="text-sm space-y-0.5">
            <div><span className="text-gray-600">SWO No.:</span> <span className="font-medium text-gray-900 ml-1">{item.swoNo ?? '-'}</span></div>
            <div><span className="text-gray-600">Work Name:</span> <span className="font-medium text-gray-900 ml-1">{item.workName ?? '-'}</span></div>
            <div><span className="text-gray-600">Reject จาก Role:</span> <span className="font-medium text-red-700 ml-1">{item.rejectByRole ?? '-'}</span></div>
            <div><span className="text-gray-600">เหตุผล:</span> <span className="text-red-700 ml-1">{item.rejectReason ?? '-'}</span></div>
          </dl>
        </div>
      </div>
      <div className="flex gap-2 mt-3">
        <button
          onClick={handleCancel}
          disabled={loading}
          className="flex-1 px-3 py-1.5 border border-gray-300 bg-white text-gray-700 rounded-lg hover:bg-gray-50 text-xs font-medium transition-colors disabled:opacity-50"
        >
          ยกเลิก
        </button>
        <button
          onClick={handleResubmit}
          disabled={loading}
          className="flex-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-xs font-medium transition-colors disabled:opacity-50"
        >
          ส่งคำขอใหม่
        </button>
      </div>
      <button
        onClick={onGoToPage}
        className="w-full mt-2 text-center text-xs text-blue-600 hover:text-blue-800 font-medium"
      >
        ไปหน้าปิด SWO →
      </button>
    </div>
  );
};

// --- Layout Component (Sidebar + Header) ---
const Layout: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);
  const { count: notifCount, items: notifItems } = useNotifications(user);
  const [taskAlertOpen, setTaskAlertOpen] = useState(false);
  const prevCountRef = useRef<number | null>(null);
  const didMountRef = useRef(false);
  const [pendingUserCount, setPendingUserCount] = useState(0);
  const [manualOpen, setManualOpen] = useState(false);

  // Menu navigation logging removed as per requirement

  useEffect(() => {
    const isAdminRole = user?.role === 'Admin' || (user?.role as string) === 'Administrator';
    if (!isAdminRole) return;
    const q = query(collection(db, 'users'));
    const unsub = onSnapshot(q, (snapshot) => {
      let count = 0;
      snapshot.forEach((docSnap) => {
        if (docSnap.data().status === 'Pending') count++;
      });
      setPendingUserCount(count);
    });
    return unsub;
  }, [user?.role]);

  // Close bell dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setBellOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Show modal on login (first load) if pending tasks exist
  useEffect(() => {
    if (!didMountRef.current && notifCount > 0) {
      didMountRef.current = true;
      setTaskAlertOpen(true);
    } else if (!didMountRef.current && notifCount === 0) {
      didMountRef.current = true;
    }
  }, [notifCount]);

  // Show modal when new tasks arrive while online
  useEffect(() => {
    if (prevCountRef.current === null) {
      prevCountRef.current = notifCount;
      return;
    }
    if (notifCount > prevCountRef.current) {
      setTaskAlertOpen(true);
    }
    prevCountRef.current = notifCount;
  }, [notifCount]);

  // Helper to determine link styles
  const navLinkClass = (path: string) => `
    flex items-center px-4 py-3 rounded-lg mb-2 transition-colors
    ${location.pathname === path ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-100'}
  `;

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden font-sans">

      {/* Sidebar */}
      <aside className={`
        fixed md:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 shadow-lg md:shadow-none transform transition-transform duration-300 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        flex flex-col
      `}>
        <div className="flex items-center justify-center h-20 border-b border-gray-200">
          <div className="w-8 h-8 bg-blue-600 text-white rounded-lg flex items-center justify-center font-bold text-xl mr-3 shadow-md border-b-2 border-blue-700">
            C
          </div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">CMG Tracker</h1>
        </div>

        <nav className="flex-1 px-4 py-6 overflow-y-auto w-full">
          <p className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">Core</p>

          {(user?.role !== 'Supervisor') && (
            <Link to="/dashboard" className={navLinkClass('/dashboard')}>
              <Briefcase className="w-5 h-5 mr-3" />
              Projects
            </Link>
          )}

          {(user?.role === 'Admin' || user?.role === 'MD' || user?.role === 'PM' || user?.role === 'CM') && (
            <Link to="/swo-creation" className={navLinkClass('/swo-creation')}>
              <FileText className="w-5 h-5 mr-3" />
              Create SWO
            </Link>
          )}

          <Link to="/daily-report" className={navLinkClass('/daily-report')}>
            <FileText className="w-5 h-5 mr-3" />
            Daily Report
          </Link>

          {['Admin', 'MD', 'PM', 'CM'].includes(user?.role || '') && (
            <Link to="/approvals" className={navLinkClass('/approvals')}>
              <ShieldAlert className="w-5 h-5 mr-3" />
              Approvals
            </Link>
          )}

          <Link to="/closures" className={navLinkClass('/closures')}>
            <ShieldAlert className="w-5 h-5 mr-3" />
            Closures
          </Link>

          {['Admin', 'MD', 'GM', 'CD', 'PM'].includes(user?.role || '') && (
            <Link to="/analytics" className={navLinkClass('/analytics')}>
              <BarChart3 className="w-5 h-5 mr-3" />
              Analytics
            </Link>
          )}

          {(user?.role === 'Admin' || (user?.role as string) === 'Administrator') && (
            <>
              <div className="mx-4 my-4 border-t border-gray-200" />
              <p className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Administration</p>
            </>
          )}

          {(user?.role === 'Admin' || (user?.role as string) === 'Administrator') && (
            <Link to="/admin" className={navLinkClass('/admin')}>
              <Shield className="w-5 h-5 mr-3" />
              Admin Panel
              {pendingUserCount > 0 && (
                <span className="ml-auto min-w-[20px] h-5 px-1.5 flex items-center justify-center bg-red-500 text-white text-[11px] font-bold rounded-full animate-pulse">
                  {pendingUserCount > 99 ? '99+' : pendingUserCount}
                </span>
              )}
            </Link>
          )}
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-gray-200 sticky top-0 z-30 flex items-center justify-between px-6 py-4">
          <button className="md:hidden text-gray-500 hover:text-gray-700" onClick={() => setIsMobileMenuOpen(true)}>
            <Menu className="w-6 h-6" />
          </button>

          <div className="flex-1"></div>

          <div className="flex items-center gap-3">

            {/* User Manual Button */}
            <button
              onClick={() => setManualOpen(true)}
              className="relative p-2 rounded-full text-gray-500 hover:bg-blue-50 hover:text-blue-600 transition-colors"
              title="คู่มือการใช้งาน"
            >
              <BookOpen className="w-5 h-5" />
            </button>

            {/* Bell Notification */}
            <div ref={bellRef} className="relative">
              <button
                onClick={() => setBellOpen(o => !o)}
                className="relative p-2 rounded-full text-gray-500 hover:bg-gray-100 transition-colors"
                title="แจ้งเตือน"
              >
                <Bell className="w-5 h-5" />
                {notifCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full animate-pulse">
                    {notifCount > 99 ? '99+' : notifCount}
                  </span>
                )}
              </button>

              {/* Dropdown */}
              {bellOpen && (
                <div className="absolute right-0 mt-2 w-96 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                    <div className="flex items-center gap-2">
                      <Bell className="w-4 h-4 text-gray-600" />
                      <h4 className="font-semibold text-gray-800 text-sm">รายการรอดำเนินการ</h4>
                    </div>
                    {notifCount > 0 && (
                      <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{notifCount} รายการ</span>
                    )}
                  </div>
                  <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
                    {notifItems.length === 0 ? (
                      <div className="px-4 py-8 text-center text-sm text-gray-400">
                        <Bell className="w-10 h-10 mx-auto mb-2 text-gray-200" />
                        <p className="font-medium">ไม่มีงานค้างรอดำเนินการ</p>
                      </div>
                    ) : (
                      notifItems.map(item => (
                        item.type === 'closure_rejected' ? (
                          <ClosureRejectedNotificationCard
                            key={item.id}
                            item={item}
                            onResubmit={async () => {
                              try {
                                await updateDoc(doc(db, 'site_work_orders', item.targetId), {
                                  closure_status: 'PM Review',
                                  pm_reject_reason: null,
                                  cd_reject_reason: null,
                                  md_reject_reason: null,
                                });
                                setBellOpen(false);
                              } catch (e) { console.error(e); }
                            }}
                            onCancel={async () => {
                              try {
                                await updateDoc(doc(db, 'site_work_orders', item.targetId), {
                                  closure_status: null,
                                  pm_reject_reason: null,
                                  cd_reject_reason: null,
                                  md_reject_reason: null,
                                });
                                setBellOpen(false);
                              } catch (e) { console.error(e); }
                            }}
                            onGoToPage={() => { navigate(item.path, { state: { targetId: item.targetId, notifType: item.type } }); setBellOpen(false); }}
                          />
                        ) : (
                          <button
                            key={item.id}
                            onClick={() => { navigate(item.path, { state: { targetId: item.targetId, notifType: item.type } }); setBellOpen(false); }}
                            className="w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors group"
                          >
                            <div className="flex items-start gap-3">
                              <span className={`mt-1 w-2.5 h-2.5 rounded-full shrink-0 animate-pulse ${
                                item.type === 'rejected' ? 'bg-red-500' :
                                item.type === 'pending_cm' ? 'bg-yellow-500' :
                                item.type === 'pending_pm' ? 'bg-blue-500' :
                                item.type === 'assigned' ? 'bg-green-500' : 'bg-orange-500'
                              }`}></span>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-gray-800 font-medium leading-snug group-hover:text-blue-700">{item.label}</p>
                                <span className={`inline-flex items-center mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  item.type === 'rejected' ? 'bg-red-100 text-red-600' :
                                  item.type === 'pending_cm' ? 'bg-yellow-100 text-yellow-700' :
                                  item.type === 'pending_pm' ? 'bg-blue-100 text-blue-700' :
                                  item.type === 'assigned' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                                }`}>{item.step}</span>
                              </div>
                              <span className="text-gray-300 group-hover:text-blue-400 text-xs mt-1">→</span>
                            </div>
                          </button>
                        )
                      ))
                    )}
                  </div>
                  {notifItems.length > 0 && (
                    <div className="px-4 py-2 border-t border-gray-100 bg-gray-50 text-center">
                      <span className="text-xs text-gray-400">คลิกรายการเพื่อไปยังหน้าที่เกี่ยวข้อง</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* User Profile */}
            <Link to="/profile" className="flex items-center gap-2 text-sm text-gray-700 hover:bg-gray-50 px-3 py-1.5 rounded-lg border border-transparent hover:border-gray-200 transition-all cursor-pointer">
              <UserCircle className="w-8 h-8 text-gray-400" />
              <div className="hidden sm:block text-right">
                <p className="font-medium text-gray-900 leading-tight">{user?.name}</p>
                <p className="text-xs text-gray-500">{user?.role}</p>
              </div>
            </Link>

            <button
              onClick={logout}
              className="text-gray-400 hover:text-red-600 transition-colors p-2 rounded-full hover:bg-red-50"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* User Manual Modal */}
        <UserManualModal isOpen={manualOpen} onClose={() => setManualOpen(false)} currentRole={user?.role} />

        {/* Task Alert Modal */}
        {taskAlertOpen && notifCount > 0 && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <div className="relative bg-white rounded-2xl shadow-2xl border border-orange-200 w-full max-w-sm mx-auto">
              <div className="p-6 flex flex-col items-center text-center gap-4">
                <div className="p-3 rounded-full bg-orange-50">
                  <Bell className="w-10 h-10 text-orange-500" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-orange-700">มีรายการรอดำเนินการ</h3>
                  <p className="mt-1 text-sm text-gray-500">คุณมี <span className="font-bold text-red-500">{notifCount} รายการ</span> ที่รอการดำเนินการ<br />กรุณาตรวจสอบและดำเนินการให้เรียบร้อย</p>
                </div>
                <div className="w-full max-h-40 overflow-y-auto space-y-1.5">
                  {notifItems.slice(0, 5).map(item => (
                    <div key={item.id} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-1.5 text-left">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${
                        item.type === 'rejected' ? 'bg-red-500' :
                        item.type === 'pending_cm' ? 'bg-yellow-500' :
                        item.type === 'pending_pm' ? 'bg-blue-500' :
                        item.type === 'assigned' ? 'bg-green-500' : 'bg-orange-500'
                      }`}></span>
                      <p className="text-xs text-gray-700 truncate flex-1">{item.label}</p>
                      <span className={`shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        item.type === 'rejected' ? 'bg-red-100 text-red-600' :
                        item.type === 'pending_cm' ? 'bg-yellow-100 text-yellow-700' :
                        item.type === 'pending_pm' ? 'bg-blue-100 text-blue-700' :
                        item.type === 'assigned' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                      }`}>{item.step}</span>
                    </div>
                  ))}
                  {notifItems.length > 5 && (
                    <p className="text-xs text-gray-400 text-center pt-1">และอีก {notifItems.length - 5} รายการ...</p>
                  )}
                </div>
                <button
                  onClick={() => setTaskAlertOpen(false)}
                  className="w-full px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-semibold text-sm transition-colors"
                >
                  ตกลง
                </button>
              </div>
            </div>
          </div>
        )}

        <main className="flex-1 overflow-auto p-4 md:p-6 bg-slate-50/50">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </div>
  );
};

// --- Login Guard: redirect authenticated users to their default page ---
const LoginGuard = () => {
  const { appUser } = useAuthContext();
  if (appUser && appUser.status === 'Approved') {
    if (appUser.role === 'Supervisor') return <Navigate to="/daily-report" replace />;
    if (appUser.role === 'Admin') return <Navigate to="/admin" replace />;
    return <Navigate to="/dashboard" replace />;
  }
  return <AuthForm />;
};

// --- Main App Router ---
export const AuthRBACRouter = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<LoginGuard />} />

          {/* Protected Routes wrapped in Layout */}
          <Route path="/dashboard" element={
            <ProtectedRoute allowedRoles={['Admin', 'MD', 'GM', 'CD', 'PM', 'CM', 'Staff', 'HR', 'HRM', 'Procurement', 'PCM', 'Site Admin']}>
              <Layout>
                <ProjectDashboard />
              </Layout>
            </ProtectedRoute>
          } />

          <Route path="/swo-creation" element={
            <ProtectedRoute allowedRoles={['Admin', 'MD', 'PM', 'CM']}>
              <Layout>
                <SWOCreationWrapper />
              </Layout>
            </ProtectedRoute>
          } />

          <Route path="/daily-report" element={
            <ProtectedRoute allowedRoles={['Admin', 'MD', 'GM', 'CD', 'PM', 'CM', 'Supervisor']}>
              <Layout>
                <DailyReportManager />
              </Layout>
            </ProtectedRoute>
          } />

          <Route path="/approvals" element={
            <ProtectedRoute allowedRoles={['Admin', 'MD', 'PM', 'CM']}>
              <Layout>
                <ApprovalDashboard />
              </Layout>
            </ProtectedRoute>
          } />

          <Route path="/closures" element={
            <ProtectedRoute>
              <Layout>
                <div className="space-y-8">
                  <SWOCloseWorkflow />
                </div>
              </Layout>
            </ProtectedRoute>
          } />

          <Route path="/analytics" element={
            <ProtectedRoute allowedRoles={['Admin', 'MD', 'GM', 'CD', 'PM']}>
              <Layout>
                <ExecutiveDashboards />
              </Layout>
            </ProtectedRoute>
          } />

          <Route path="/admin" element={
            <ProtectedRoute allowedRoles={['Admin', 'Administrator' as any]}>
              <Layout>
                <AdminDashboard />
              </Layout>
            </ProtectedRoute>
          } />

          <Route path="/profile" element={
            <ProtectedRoute>
              <Layout>
                <Profile />
              </Layout>
            </ProtectedRoute>
          } />

          {/* Catch all redirect to root */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default AuthRBACRouter;

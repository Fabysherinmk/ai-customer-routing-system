import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { 
  Inbox, 
  LogOut, 
  Menu, 
  X, 
  Shield, 
  UserPlus,
  Users
} from 'lucide-react';
import api from '../services/api';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Create User state
  const [userModalOpen, setUserModalOpen] = useState<boolean>(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState<'ADMIN' | 'AGENT'>('AGENT');
  const [submittingUser, setSubmittingUser] = useState(false);

  // Toast notification state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' } | null>(null);

  // Retrieve user info
  const userJson = localStorage.getItem('crrs_user');
  const user = userJson ? JSON.parse(userJson) : { name: 'Support Staff', role: 'AGENT', email: '' };

  const handleLogout = () => {
    localStorage.removeItem('crrs_token');
    localStorage.removeItem('crrs_user');
    navigate('/login');
  };

  const showToast = (message: string, type: 'success' | 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingUser(true);
    try {
      await api.post('/users', {
        name: newUserName,
        email: newUserEmail,
        password: newUserPassword,
        role: newUserRole
      });
      
      // Clear form
      setNewUserName('');
      setNewUserEmail('');
      setNewUserPassword('');
      setNewUserRole('AGENT');
      setUserModalOpen(false);
      showToast('User account created successfully!', 'success');

      // Dispatch global event so the Users list page can refresh if open
      window.dispatchEvent(new CustomEvent('users-changed'));
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.error || 'Failed to create user account');
    } finally {
      setSubmittingUser(false);
    }
  };

  const navItems = [
    { name: 'Dashboard', path: '/', icon: Inbox },
  ];

  if (user && user.role === 'ADMIN') {
    navItems.push({ name: 'Users', path: '/users', icon: Users });
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col md:flex-row text-slate-100">
      {/* Mobile Header */}
      <header className="md:hidden flex items-center justify-between px-6 py-4 bg-slate-900 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-brand-500 rounded-lg text-white font-bold text-lg">
            ⚡
          </div>
          <span className="font-extrabold text-xl tracking-tight font-sans text-white">CRRS</span>
        </div>
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="text-slate-400 hover:text-white transition-colors">
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </header>

      {/* Sidebar - Desktop */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 border-r border-slate-800/80 flex flex-col justify-between transition-transform duration-300 ease-in-out md:translate-x-0 md:static md:h-screen
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div>
          {/* Brand Header */}
          <div className="flex items-center justify-between px-6 py-6 border-b border-slate-800/50">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-gradient-to-tr from-brand-600 to-brand-400 rounded-xl text-white font-bold text-xl shadow-lg shadow-brand-500/20">
                ⚡
              </div>
              <div>
                <span className="font-extrabold text-2xl tracking-tight bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">CRRS</span>
                <p className="text-[9px] text-brand-400 tracking-widest uppercase font-semibold">Support System</p>
              </div>
            </div>
            <button onClick={() => setMobileMenuOpen(false)} className="md:hidden text-slate-400 hover:text-white">
              <X size={20} />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="px-4 py-6 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`
                    flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200
                    ${isActive 
                      ? 'bg-brand-500/10 border border-brand-500/20 text-brand-400 font-semibold' 
                      : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'}
                  `}
                >
                  <Icon size={18} className={isActive ? 'text-brand-400' : 'text-slate-400'} />
                  {item.name}
                </Link>
              );
            })}

            {/* Create User button in Sidebar (Admins only) */}
            {user?.role === 'ADMIN' && (
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  setUserModalOpen(true);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-slate-400 hover:bg-slate-800/55 hover:text-slate-200 transition-all duration-200 mt-4 border border-dashed border-slate-800 hover:border-slate-700 bg-slate-950/20 cursor-pointer"
              >
                <UserPlus size={18} className="text-brand-400" />
                Create User
              </button>
            )}
          </nav>
        </div>

        {/* User profile & Logout */}
        <div className="p-4 border-t border-slate-800/50 bg-slate-900/50">
          <div className="flex items-center justify-between gap-2 px-2">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-brand-400 text-sm flex-shrink-0">
                {user.name.split(' ').map((n: string) => n[0]).join('')}
              </div>
              <div className="overflow-hidden">
                <h4 className="text-sm font-bold text-slate-200 truncate">{user.name}</h4>
                <p className="text-[10px] text-slate-400 font-medium truncate flex items-center gap-1">
                  <Shield size={10} className="text-brand-400" />
                  {user.role}
                </p>
              </div>
            </div>
            <button 
              onClick={handleLogout}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
              title="Sign Out"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-y-auto max-h-screen">
        {/* Content wrapper */}
        <div className="flex-1 p-6 md:p-8">
          {children}
        </div>
      </main>

      {/* Toast Notification Banner */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 py-3.5 px-5 rounded-2xl shadow-xl flex items-center gap-3 border transition-all duration-300 bg-emerald-950/90 text-emerald-200 border-emerald-500/30`}>
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 pulse-glow" />
          <span className="text-xs font-bold font-sans tracking-wide">{toast.message}</span>
        </div>
      )}

      {/* Create User Modal */}
      {userModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-md rounded-3xl p-6 sm:p-8 shadow-2xl relative border border-slate-800">
            <button 
              onClick={() => setUserModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 bg-brand-500/10 text-brand-400 rounded-xl">
                <UserPlus size={20} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Create User</h3>
                <p className="text-xs text-slate-400">Register a new administrator or support agent</p>
              </div>
            </div>

            <form onSubmit={handleUserSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Full Name</label>
                <input
                  type="text"
                  required
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="E.g. Peter Parker"
                  className="w-full px-3 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 text-slate-100 placeholder-slate-700"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Email Address</label>
                <input
                  type="email"
                  required
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  placeholder="peter@dailybugle.com"
                  className="w-full px-3 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 text-slate-100 placeholder-slate-700"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Temporary Password</label>
                <input
                  type="password"
                  required
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 text-slate-100 placeholder-slate-700"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Role Type</label>
                <select
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value as any)}
                  className="w-full px-3 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 text-slate-100 cursor-pointer"
                >
                  <option value="AGENT">AGENT (Standard Support Agent)</option>
                  <option value="ADMIN">ADMIN (Operations Administrator)</option>
                </select>
              </div>

              <div className="pt-4 border-t border-slate-800/80 mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setUserModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-900 border border-slate-800 hover:bg-slate-800 rounded-xl text-xs font-bold text-slate-400 hover:text-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingUser}
                  className="flex items-center gap-1.5 px-5 py-2.5 bg-brand-500 hover:bg-brand-600 rounded-xl text-xs font-bold text-white shadow-lg shadow-brand-500/20 disabled:opacity-50 transition-all"
                >
                  {submittingUser ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <UserPlus size={12} />
                      Register User
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useEffect, useState, useCallback } from 'react';
import { 
  Users, 
  Search, 
  Shield, 
  Mail, 
  Calendar,
  AlertCircle
} from 'lucide-react';
import api from '../services/api';

interface UserItem {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt: string;
}

export const UsersList: React.FC = () => {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchUsers = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const response = await api.get('/users');
      setUsers(response.data);
      setError('');
    } catch (err: any) {
      console.error(err);
      setError('Failed to fetch users list. Make sure the backend service is running.');
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();

    // Listen to local user-creation events to refresh automatically
    const handleUsersChanged = () => {
      fetchUsers(false);
    };

    window.addEventListener('users-changed', handleUsersChanged);
    return () => {
      window.removeEventListener('users-changed', handleUsersChanged);
    };
  }, [fetchUsers]);

  // Filter users based on search term
  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header section */}
      <section className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight font-sans">
            User Directory
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Browse and manage all registered administrators and support agents.
          </p>
        </div>
      </section>

      {/* Control bar */}
      <section className="glass-panel p-5 rounded-3xl">
        <div className="relative max-w-md">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
            <Search size={16} />
          </span>
          <input
            type="text"
            placeholder="Search by name, email, or role..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 placeholder-slate-600 text-slate-100"
          />
        </div>
      </section>

      {/* Users table */}
      <section className="glass-panel rounded-3xl overflow-hidden shadow-2xl">
        {error && (
          <div className="p-8 text-center">
            <div className="inline-flex p-3 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 mb-4">
              <AlertCircle size={28} />
            </div>
            <p className="text-sm text-slate-400">{error}</p>
            <button 
              onClick={() => fetchUsers()}
              className="mt-4 px-4 py-2 bg-slate-800 border border-slate-700 hover:bg-slate-700 rounded-xl text-xs font-bold transition-all text-slate-200"
            >
              Retry Connection
            </button>
          </div>
        )}

        {!error && loading && (
          <div className="p-20 text-center flex flex-col items-center justify-center space-y-4">
            <div className="w-8 h-8 border-4 border-brand-500/30 border-t-brand-500 rounded-full animate-spin"></div>
            <span className="text-sm text-slate-400 font-medium">Loading user data...</span>
          </div>
        )}

        {!error && !loading && filteredUsers.length === 0 && (
          <div className="p-16 text-center">
            <div className="inline-flex p-3.5 bg-slate-950 rounded-2xl border border-slate-800 text-slate-600 mb-4">
              <Users size={32} />
            </div>
            <h4 className="text-base font-bold text-slate-300">No users found</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              {searchTerm ? 'No matches found for your search term.' : 'No registered users found.'}
            </p>
          </div>
        )}

        {!error && !loading && filteredUsers.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800/80 bg-slate-900/30 text-xs font-bold text-slate-400 uppercase tracking-widest">
                  <th className="py-4 px-6 select-none">Name</th>
                  <th className="py-4 px-6 select-none">Email Address</th>
                  <th className="py-4 px-6 select-none">System Role</th>
                  <th className="py-4 px-6 select-none">Registration Date</th>
                  <th className="py-4 px-6 select-none">User ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50 text-slate-300 text-sm">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-900/20 transition-colors">
                    {/* User profile with initials avatar */}
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-brand-400 text-xs flex-shrink-0">
                          {u.name.split(' ').map((n: string) => n[0]).join('')}
                        </div>
                        <h4 className="font-bold text-slate-200">{u.name}</h4>
                      </div>
                    </td>

                    {/* Email */}
                    <td className="py-4 px-6 font-medium">
                      <div className="flex items-center gap-2 text-slate-300">
                        <Mail size={14} className="text-slate-500" />
                        <span>{u.email}</span>
                      </div>
                    </td>

                    {/* Role */}
                    <td className="py-4 px-6 font-semibold">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs border ${
                        u.role === 'ADMIN' 
                          ? 'text-brand-400 bg-brand-500/10 border-brand-500/20' 
                          : 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20'
                      }`}>
                        <Shield size={12} />
                        {u.role}
                      </span>
                    </td>

                    {/* Created Date */}
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <Calendar size={14} className="text-slate-500" />
                        <span>{new Date(u.createdAt).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}</span>
                      </div>
                    </td>

                    {/* ID */}
                    <td className="py-4 px-6 font-mono text-[10px] text-slate-500">
                      {u.id}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};

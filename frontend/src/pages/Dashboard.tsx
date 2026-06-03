import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  Filter, 
  Plus,
  RefreshCw,
  Clock,
  CheckCircle,
  Inbox,
  AlertCircle,
  FileText,
  User,
  ArrowUpDown,
  Send,
  MessageSquare,
  X
} from 'lucide-react';
import api from '../services/api';
import type { CustomerRequest, DashboardMetrics, RequestStatus } from '../types';
import { useSocket } from '../context/SocketContext';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { socket } = useSocket();


  // Requests and metrics state
  const [requests, setRequests] = useState<CustomerRequest[]>([]);
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    total: 0,
    new: 0,
    inProgress: 0,
    resolved: 0,
    queued: 0,
  });



  // Filter and search state
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [priorityFilter, setPriorityFilter] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // UI state
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' } | null>(null);
  
  // Intake Modal state
  const [intakeModalOpen, setIntakeModalOpen] = useState<boolean>(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newChannel, setNewChannel] = useState<'email' | 'whatsapp' | 'webform' | 'chat'>('email');
  const [newMessage, setNewMessage] = useState('');
  const [submittingIntake, setSubmittingIntake] = useState(false);

  // Fetch data
  const fetchData = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const response = await api.get('/requests', {
        params: {
          status: statusFilter || undefined,
          priority: priorityFilter || undefined,
          category: categoryFilter || undefined,
          search: searchTerm || undefined,
          sortBy,
          order: sortOrder,
        },
      });
      setRequests(response.data.requests);
      setMetrics(response.data.metrics);
      setError('');
    } catch (err: any) {
      console.error('Fetch dashboard data error:', err);
      setError('Failed to fetch requests. Verify the backend service is active.');
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [statusFilter, priorityFilter, categoryFilter, searchTerm, sortBy, sortOrder]);

  // Initial Fetch & Filters Effect
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Socket updates listener
  useEffect(() => {
    if (!socket) return;

    const handleDashboardRefresh = () => {
      // Trigger a silent reload of data
      fetchData(false);
    };

    const handleRequestCreated = (newReq: CustomerRequest) => {
      showToast(`New request received from ${newReq.customerName}!`, 'info');
      fetchData(false);
    };

    const handleRequestClassified = (data: { requestId: string; category: string; priority: string }) => {
      showToast(`Request classified: ${data.category} (${data.priority})`, 'success');
      fetchData(false);
    };

    socket.on('dashboard:refresh', handleDashboardRefresh);
    socket.on('request:created', handleRequestCreated);
    socket.on('request:classified', handleRequestClassified);

    return () => {
      socket.off('dashboard:refresh', handleDashboardRefresh);
      socket.off('request:created', handleRequestCreated);
      socket.off('request:classified', handleRequestClassified);
    };
  }, [socket, fetchData]);

  const showToast = (message: string, type: 'success' | 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const handleIntakeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingIntake(true);
    try {
      // Generates a mock x-idempotency-key to prevent accidental duplicate clicks
      const key = `key-${Date.now()}`;
      await api.post('/requests', {
        customerName: newCustomerName,
        email: newEmail,
        channel: newChannel,
        message: newMessage
      }, {
        headers: { 'X-Idempotency-Key': key }
      });

      // Clear form
      setNewCustomerName('');
      setNewEmail('');
      setNewMessage('');
      setIntakeModalOpen(false);
      showToast('Support request submitted successfully!', 'success');
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.error || 'Failed to submit request');
    } finally {
      setSubmittingIntake(false);
    }
  };



  // Helper classes for colors
  const getStatusBadge = (status: RequestStatus) => {
    switch (status) {
      case 'NEW':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">NEW</span>;
      case 'QUEUED':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">QUEUED</span>;
      case 'IN_PROGRESS':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">IN PROGRESS</span>;
      case 'RESOLVED':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">RESOLVED</span>;
      case 'CLOSED':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-800 text-slate-400 border border-slate-700">CLOSED</span>;
    }
  };

  const getPriorityBadge = (priority?: 'HIGH' | 'MEDIUM' | 'LOW') => {
    if (!priority) return <span className="text-slate-500 text-xs">-</span>;
    switch (priority) {
      case 'HIGH':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">HIGH</span>;
      case 'MEDIUM':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">MEDIUM</span>;
      case 'LOW':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-800 text-slate-300 border border-slate-700">LOW</span>;
    }
  };

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'email':
        return <span className="text-[10px] uppercase font-bold text-sky-400 px-2 py-0.5 bg-sky-500/10 border border-sky-500/10 rounded">EMAIL</span>;
      case 'whatsapp':
        return <span className="text-[10px] uppercase font-bold text-emerald-400 px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/10 rounded">WHATSAPP</span>;
      case 'webform':
        return <span className="text-[10px] uppercase font-bold text-purple-400 px-2 py-0.5 bg-purple-500/10 border border-purple-500/10 rounded">WEBFORM</span>;
      default:
        return <span className="text-[10px] uppercase font-bold text-slate-400 px-2 py-0.5 bg-slate-500/10 border border-slate-500/10 rounded">CHAT</span>;
    }
  };

  return (
    <div className="space-y-8 relative">
      {/* Toast Notification Banner */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 py-3.5 px-5 rounded-2xl shadow-xl flex items-center gap-3 border transition-all duration-300
          ${toast.type === 'success' 
            ? 'bg-emerald-950/90 text-emerald-200 border-emerald-500/30' 
            : 'bg-blue-950/90 text-blue-200 border-brand-500/30'}
        `}>
          <div className={`w-2.5 h-2.5 rounded-full ${toast.type === 'success' ? 'bg-emerald-400 pulse-glow' : 'bg-brand-400 pulse-glow'}`} />
          <span className="text-sm font-semibold">{toast.message}</span>
        </div>
      )}

      {/* Metrics Row */}
      <section className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total card */}
        <div className="glass-panel p-5 rounded-2xl relative overflow-hidden group">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Requests</p>
              <h3 className="text-3xl font-extrabold mt-2 font-sans text-slate-100">{metrics.total}</h3>
            </div>
            <div className="p-2 bg-slate-800 rounded-lg text-slate-400">
              <Inbox size={18} />
            </div>
          </div>
          <div className="absolute bottom-0 inset-x-0 h-1 bg-gradient-to-r from-slate-700 to-slate-500"></div>
        </div>

        {/* New Card */}
        <div className="glass-panel p-5 rounded-2xl relative overflow-hidden group">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">New</p>
              <h3 className="text-3xl font-extrabold mt-2 font-sans text-blue-400">{metrics.new}</h3>
            </div>
            <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
              <Clock size={18} />
            </div>
          </div>
          <div className="absolute bottom-0 inset-x-0 h-1 bg-blue-500"></div>
        </div>

        {/* Queued Card */}
        <div className="glass-panel p-5 rounded-2xl relative overflow-hidden group">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Queued</p>
              <h3 className="text-3xl font-extrabold mt-2 font-sans text-amber-400">{metrics.queued}</h3>
            </div>
            <div className="p-2 bg-amber-500/10 rounded-lg text-amber-400 animate-pulse-slow">
              <RefreshCw size={18} />
            </div>
          </div>
          <div className="absolute bottom-0 inset-x-0 h-1 bg-amber-500 animate-pulse-slow"></div>
        </div>

        {/* In Progress Card */}
        <div className="glass-panel p-5 rounded-2xl relative overflow-hidden group">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">In Progress</p>
              <h3 className="text-3xl font-extrabold mt-2 font-sans text-indigo-400">{metrics.inProgress}</h3>
            </div>
            <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400">
              <AlertCircle size={18} />
            </div>
          </div>
          <div className="absolute bottom-0 inset-x-0 h-1 bg-indigo-500"></div>
        </div>

        {/* Resolved Card */}
        <div className="glass-panel p-5 rounded-2xl relative overflow-hidden group">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Resolved</p>
              <h3 className="text-3xl font-extrabold mt-2 font-sans text-emerald-400">{metrics.resolved}</h3>
            </div>
            <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
              <CheckCircle size={18} />
            </div>
          </div>
          <div className="absolute bottom-0 inset-x-0 h-1 bg-emerald-500"></div>
        </div>
      </section>

      {/* Control Bar (Filters & Creation) */}
      <section className="glass-panel p-5 rounded-3xl space-y-4">
        <div className="flex flex-col xl:flex-row gap-4 items-stretch xl:items-center justify-between">
          
          {/* Search box */}
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
              <Search size={16} />
            </span>
            <input
              type="text"
              placeholder="Search by customer name, email, or message keyword..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 placeholder-slate-600 text-slate-100"
            />
          </div>

          {/* Filters Row */}
          <div className="flex flex-wrap items-center gap-3">
            
            {/* Status Select */}
            <div className="flex items-center bg-slate-950/80 border border-slate-800 rounded-xl px-2">
              <span className="text-slate-500 pl-1"><Filter size={14} /></span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-transparent border-0 py-2.5 px-2 text-xs font-semibold text-slate-300 focus:outline-none cursor-pointer"
              >
                <option value="">All Statuses</option>
                <option value="NEW">New</option>
                <option value="QUEUED">Queued</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="RESOLVED">Resolved</option>
                <option value="CLOSED">Closed</option>
              </select>
            </div>

            {/* Category Select */}
            <div className="flex items-center bg-slate-950/80 border border-slate-800 rounded-xl px-2">
              <span className="text-slate-500 pl-1"><Filter size={14} /></span>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="bg-transparent border-0 py-2.5 px-2 text-xs font-semibold text-slate-300 focus:outline-none cursor-pointer"
              >
                <option value="">All Categories</option>
                <option value="Billing">Billing</option>
                <option value="Technical Support">Technical Support</option>
                <option value="Sales">Sales</option>
                <option value="General Inquiry">General Inquiry</option>
              </select>
            </div>

            {/* Priority Select */}
            <div className="flex items-center bg-slate-950/80 border border-slate-800 rounded-xl px-2">
              <span className="text-slate-500 pl-1"><Filter size={14} /></span>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="bg-transparent border-0 py-2.5 px-2 text-xs font-semibold text-slate-300 focus:outline-none cursor-pointer"
              >
                <option value="">All Priorities</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
            </div>

            {/* Submit Mock Request Button */}
            <button
              onClick={() => setIntakeModalOpen(true)}
              className="flex items-center gap-1.5 py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-brand-500 hover:bg-brand-600 transition-colors shadow-lg shadow-brand-500/10 cursor-pointer"
            >
              <Plus size={14} />
              Simulate Intake
            </button>


          </div>
        </div>
      </section>

      {/* Main Table section */}
      <section className="glass-panel rounded-3xl overflow-hidden shadow-2xl">
        {error && (
          <div className="p-8 text-center">
            <div className="inline-flex p-3 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 mb-4">
              <AlertCircle size={28} />
            </div>
            <p className="text-sm text-slate-400">{error}</p>
            <button 
              onClick={() => fetchData()}
              className="mt-4 px-4 py-2 bg-slate-800 border border-slate-700 hover:bg-slate-700 rounded-xl text-xs font-bold transition-all text-slate-200"
            >
              Retry Connection
            </button>
          </div>
        )}

        {!error && loading && (
          <div className="p-20 text-center flex flex-col items-center justify-center space-y-4">
            <div className="w-8 h-8 border-4 border-brand-500/30 border-t-brand-500 rounded-full animate-spin"></div>
            <span className="text-sm text-slate-400 font-medium">Synchronizing requests data...</span>
          </div>
        )}

        {!error && !loading && requests.length === 0 && (
          <div className="p-16 text-center">
            <div className="inline-flex p-3.5 bg-slate-950 rounded-2xl border border-slate-800 text-slate-600 mb-4">
              <FileText size={32} />
            </div>
            <h4 className="text-base font-bold text-slate-300">No requests found</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              Try adjusting your search criteria, removing filters, or clicking "Simulate Intake" to spawn sample tickets.
            </p>
          </div>
        )}

        {!error && !loading && requests.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800/80 bg-slate-900/30 text-xs font-bold text-slate-400 uppercase tracking-widest">
                  <th className="py-4 px-6 select-none cursor-pointer hover:text-slate-200" onClick={() => handleSort('id')}>
                    <div className="flex items-center gap-1.5">
                      ID
                      <ArrowUpDown size={12} />
                    </div>
                  </th>
                  <th className="py-4 px-6 select-none cursor-pointer hover:text-slate-200" onClick={() => handleSort('customerName')}>
                    <div className="flex items-center gap-1.5">
                      Customer
                      <ArrowUpDown size={12} />
                    </div>
                  </th>
                  <th className="py-4 px-6 select-none">Channel</th>
                  <th className="py-4 px-6 select-none cursor-pointer hover:text-slate-200" onClick={() => handleSort('category')}>
                    <div className="flex items-center gap-1.5">
                      Category
                      <ArrowUpDown size={12} />
                    </div>
                  </th>
                  <th className="py-4 px-6 select-none cursor-pointer hover:text-slate-200" onClick={() => handleSort('priority')}>
                    <div className="flex items-center gap-1.5">
                      Priority
                      <ArrowUpDown size={12} />
                    </div>
                  </th>
                  <th className="py-4 px-6 select-none cursor-pointer hover:text-slate-200" onClick={() => handleSort('status')}>
                    <div className="flex items-center gap-1.5">
                      Status
                      <ArrowUpDown size={12} />
                    </div>
                  </th>
                  <th className="py-4 px-6 select-none">Assignee</th>
                  <th className="py-4 px-6 select-none cursor-pointer hover:text-slate-200" onClick={() => handleSort('createdAt')}>
                    <div className="flex items-center gap-1.5">
                      Created Time
                      <ArrowUpDown size={12} />
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50 text-slate-300 text-sm">
                {requests.map((req) => (
                  <tr 
                    key={req.id}
                    onClick={() => navigate(`/requests/${req.id}`)}
                    className="hover:bg-slate-900/40 cursor-pointer transition-colors"
                  >
                    {/* ID */}
                    <td className="py-4 px-6 font-mono text-[11px] text-slate-500 font-semibold max-w-[80px] truncate">
                      #{req.id.substring(0, 8)}
                    </td>
                    {/* Customer */}
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 font-bold text-xs flex-shrink-0">
                          <User size={12} />
                        </div>
                        <div className="overflow-hidden">
                          <h4 className="font-bold text-slate-200 truncate">{req.customerName}</h4>
                          <p className="text-[11px] text-slate-500 truncate">{req.email}</p>
                        </div>
                      </div>
                    </td>
                    {/* Channel */}
                    <td className="py-4 px-6 font-semibold">
                      {getChannelIcon(req.channel)}
                    </td>
                    {/* Category */}
                    <td className="py-4 px-6 font-medium text-slate-300">
                      {req.classification ? (
                        <span className="flex items-center gap-1.5 text-xs">
                          {req.classification.category}
                          <span className="text-[10px] text-slate-500 font-medium">({Math.round(req.classification.confidence * 100)}%)</span>
                        </span>
                      ) : (
                        <span className="text-slate-500 italic text-xs">Awaiting...</span>
                      )}
                    </td>
                    {/* Priority */}
                    <td className="py-4 px-6">
                      {getPriorityBadge(req.classification?.priority)}
                    </td>
                    {/* Status */}
                    <td className="py-4 px-6">
                      {getStatusBadge(req.status)}
                    </td>
                    {/* Assignee */}
                    <td className="py-4 px-6 font-medium text-xs">
                      {req.assignedTo ? (
                        <span className="text-brand-400 bg-brand-500/10 border border-brand-500/20 px-2.5 py-1 rounded-xl">
                          {req.assignedTo.name}
                        </span>
                      ) : (
                        <span className="text-slate-600 italic">Unassigned</span>
                      )}
                    </td>
                    {/* Created Time */}
                    <td className="py-4 px-6 text-xs text-slate-500 font-medium">
                      {new Date(req.createdAt).toLocaleString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Intake Simulator Modal */}
      {intakeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-lg rounded-3xl p-6 sm:p-8 shadow-2xl relative">
            <button 
              onClick={() => setIntakeModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 bg-brand-500/10 text-brand-400 rounded-xl">
                <MessageSquare size={20} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Simulate Customer Request</h3>
                <p className="text-xs text-slate-400">Creates a ticket. The background worker picks it up in 2s.</p>
              </div>
            </div>

            <form onSubmit={handleIntakeSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Customer Name</label>
                  <input
                    type="text"
                    required
                    value={newCustomerName}
                    onChange={(e) => setNewCustomerName(e.target.value)}
                    placeholder="E.g. Sarah Connor"
                    className="w-full px-3 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 text-slate-100 placeholder-slate-700"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Email Address</label>
                  <input
                    type="email"
                    required
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="sarah@skynet.com"
                    className="w-full px-3 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 text-slate-100 placeholder-slate-700"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Submission Channel</label>
                <div className="grid grid-cols-4 gap-2">
                  {(['email', 'whatsapp', 'webform', 'chat'] as const).map((ch) => (
                    <button
                      key={ch}
                      type="button"
                      onClick={() => setNewChannel(ch)}
                      className={`py-2 px-3 rounded-xl border text-xs font-semibold uppercase transition-all duration-200
                        ${newChannel === ch 
                          ? 'bg-brand-500 border-brand-400 text-white shadow-lg shadow-brand-500/10' 
                          : 'bg-slate-950/60 border-slate-850 hover:bg-slate-900 text-slate-400 hover:text-slate-200'}
                      `}
                    >
                      {ch}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Support Request Message</label>
                <textarea
                  required
                  rows={4}
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Describe the issue. Use keywords: 'refund', 'bug', 'demo', 'urgent' to trigger classification rules."
                  className="w-full px-3 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 text-slate-100 placeholder-slate-750 resize-none font-sans"
                />
              </div>

              <div className="pt-4 border-t border-slate-800/80 mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIntakeModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-900 border border-slate-800 hover:bg-slate-800 rounded-xl text-xs font-bold text-slate-400 hover:text-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingIntake}
                  className="flex items-center gap-1.5 px-5 py-2.5 bg-brand-500 hover:bg-brand-600 rounded-xl text-xs font-bold text-white shadow-lg shadow-brand-500/20 disabled:opacity-50 transition-all"
                >
                  {submittingIntake ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <Send size={12} />
                      Submit Ticket
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

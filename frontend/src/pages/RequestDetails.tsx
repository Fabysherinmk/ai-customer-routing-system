import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  User, 
  Mail, 
  Calendar, 
  MessageSquare, 
  Cpu, 
  FileText,
  Send,
  AlertTriangle,
  History,
  Shield
} from 'lucide-react';
import api from '../services/api';
import type { CustomerRequest, Note, RequestEvent, RequestStatus } from '../types';
import { useSocket } from '../context/SocketContext';

export const RequestDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { socket } = useSocket();

  // Retrieve logged-in user
  const userJson = localStorage.getItem('crrs_user');
  const user = userJson ? JSON.parse(userJson) : null;

  // Data states
  const [request, setRequest] = useState<CustomerRequest | null>(null);
  const [newNote, setNewNote] = useState<string>('');
  
  // Assignee states (Admins only)
  const [agents, setAgents] = useState<any[]>([]);

  // UI states
  const [loading, setLoading] = useState<boolean>(true);
  const [submittingNote, setSubmittingNote] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  
  const notesEndRef = useRef<HTMLDivElement>(null);

  // Fetch individual request payload
  const fetchRequestDetails = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const response = await api.get(`/requests/${id}`);
      setRequest(response.data);
      setError('');
    } catch (err: any) {
      console.error(err);
      setError('Failed to load request details. The request might not exist.');
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequestDetails();
  }, [id]);

  useEffect(() => {
    const fetchAgents = async () => {
      try {
        const response = await api.get('/users');
        setAgents(response.data);
      } catch (err) {
        console.error('Failed to load agents list:', err);
      }
    };

    if (user?.role === 'ADMIN') {
      fetchAgents();
    }
  }, [user?.role]);

  // Handle Socket events for this specific request
  useEffect(() => {
    if (!socket || !id) return;

    const handleRequestUpdated = (updatedReq: CustomerRequest) => {
      if (updatedReq.id === id) {
        // Quietly update details (covers status updates and classifications completing)
        setRequest(updatedReq);
        fetchRequestDetails(false);
      }
    };

    const handleNoteAdded = (data: { requestId: string; note: Note; event: RequestEvent }) => {
      if (data.requestId === id) {
        setRequest((prev) => {
          if (!prev) return null;
          const currentNotes = prev.notes || [];
          const currentEvents = prev.events || [];
          return {
            ...prev,
            notes: [...currentNotes, data.note],
            events: [...currentEvents, data.event]
          };
        });
        scrollToBottom();
      }
    };

    socket.on('request:updated', handleRequestUpdated);
    socket.on('request:note_added', handleNoteAdded);

    return () => {
      socket.off('request:updated', handleRequestUpdated);
      socket.off('request:note_added', handleNoteAdded);
    };
  }, [socket, id]);

  const scrollToBottom = () => {
    setTimeout(() => {
      notesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleStatusChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nextStatus = e.target.value as RequestStatus;
    if (!request) return;

    try {
      await api.patch(`/requests/${request.id}/status`, { status: nextStatus });
      // Details are updated via Socket broadcast or fallback refresh
      fetchRequestDetails(false);
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.error || 'Failed to update request status');
    }
  };

  const handleAssigneeChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nextAssigneeId = e.target.value || null;
    if (!request) return;

    try {
      await api.patch(`/requests/${request.id}/assign`, { userId: nextAssigneeId });
      // Details are updated via Socket broadcast or fallback refresh
      fetchRequestDetails(false);
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.error || 'Failed to update request assignee');
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim() || !request) return;

    setSubmittingNote(true);
    try {
      await api.post(`/requests/${request.id}/notes`, { note: newNote });
      setNewNote('');
      scrollToBottom();
    } catch (err: any) {
      console.error(err);
      alert('Failed to insert note.');
    } finally {
      setSubmittingNote(false);
    }
  };

  const getStatusBadge = (status?: RequestStatus) => {
    if (!status) return null;
    switch (status) {
      case 'NEW':
        return <span className="px-3 py-1 rounded-xl text-xs font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">NEW</span>;
      case 'QUEUED':
        return <span className="px-3 py-1 rounded-xl text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 pulse-glow">QUEUED</span>;
      case 'IN_PROGRESS':
        return <span className="px-3 py-1 rounded-xl text-xs font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">IN PROGRESS</span>;
      case 'RESOLVED':
        return <span className="px-3 py-1 rounded-xl text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">RESOLVED</span>;
      case 'CLOSED':
        return <span className="px-3 py-1 rounded-xl text-xs font-bold bg-slate-800 text-slate-400 border border-slate-700">CLOSED</span>;
    }
  };

  const getPriorityColor = (priority?: string) => {
    if (!priority) return 'text-slate-400 border-slate-800';
    switch (priority) {
      case 'HIGH':
        return 'text-rose-400 bg-rose-500/10 border-rose-500/25';
      case 'MEDIUM':
        return 'text-amber-400 bg-amber-500/10 border-amber-500/25';
      case 'LOW':
        return 'text-slate-300 bg-slate-800 border-slate-700';
      default:
        return 'text-slate-400';
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-24 space-y-4">
        <div className="w-9 h-9 border-4 border-brand-500/30 border-t-brand-500 rounded-full animate-spin"></div>
        <p className="text-sm text-slate-400 font-medium">Fetching request timelines and classification matrices...</p>
      </div>
    );
  }

  if (error || !request) {
    return (
      <div className="text-center p-12 glass-panel rounded-3xl max-w-md mx-auto mt-10">
        <div className="inline-flex p-3 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 mb-4">
          <AlertTriangle size={24} />
        </div>
        <h4 className="text-base font-bold text-slate-200">Load Error</h4>
        <p className="text-xs text-slate-500 mt-1">{error || 'This support request does not exist.'}</p>
        <button 
          onClick={() => navigate('/')}
          className="mt-6 flex items-center gap-1.5 mx-auto px-4 py-2 bg-slate-850 hover:bg-slate-800 border border-slate-700 rounded-xl text-xs font-bold text-slate-300 transition-all"
        >
          <ArrowLeft size={14} /> Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Navigation */}
      <button 
        onClick={() => navigate('/')}
        className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white px-3 py-2 rounded-xl bg-slate-900 border border-slate-800/80 hover:bg-slate-800 transition-all cursor-pointer"
      >
        <ArrowLeft size={14} />
        Back to Dashboard
      </button>

      {/* Main Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Left Side: Request & AI Classification Details (2/3 columns on wide screens) */}
        <div className="xl:col-span-2 space-y-6">
          
          {/* Customer message container */}
          <section className="glass-panel p-6 sm:p-8 rounded-3xl space-y-6 relative overflow-hidden">
            {/* Header info */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/60 pb-5">
              <div>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Ticket Reference</p>
                <h2 className="text-xl font-extrabold text-white mt-1 font-mono">#{request.id}</h2>
              </div>
              <div className="flex items-center gap-3">
                {getStatusBadge(request.status)}
                
                {/* Status action dropdown (Admins only) */}
                {user?.role === 'ADMIN' && (
                  <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl px-2">
                    <select
                      value={request.status}
                      onChange={handleStatusChange}
                      className="bg-transparent border-0 py-2 px-1 text-xs font-semibold text-slate-300 focus:outline-none cursor-pointer"
                    >
                      <option value="NEW">New</option>
                      <option value="QUEUED">Queued</option>
                      <option value="IN_PROGRESS">In Progress</option>
                      <option value="RESOLVED">Resolved</option>
                      <option value="CLOSED">Closed</option>
                    </select>
                  </div>
                )}

                {/* Assignee Selection dropdown (Admins only) */}
                {user?.role === 'ADMIN' && (
                  <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl px-2">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1 pr-1">Assign:</span>
                    <select
                      value={request.assignedToId || ''}
                      onChange={handleAssigneeChange}
                      className="bg-transparent border-0 py-2 px-1 text-xs font-semibold text-brand-400 focus:outline-none cursor-pointer"
                    >
                      <option value="">Unassigned</option>
                      {agents.map((agent) => (
                        <option key={agent.id} value={agent.id}>
                          {agent.name} ({agent.role})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Display active assignee badge (Agents only) */}
                {user?.role === 'AGENT' && request.assignedTo && (
                  <span className="px-3 py-1 rounded-xl text-xs font-bold bg-brand-500/10 text-brand-400 border border-brand-500/20">
                    Assignee: {request.assignedTo.name}
                  </span>
                )}
              </div>
            </div>

            {/* Customer Metadata Card */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-950/60 p-4 rounded-2xl border border-slate-900">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-800 text-slate-400 rounded-lg"><User size={16} /></div>
                <div className="overflow-hidden">
                  <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Customer</p>
                  <h4 className="text-xs font-bold text-slate-300 truncate">{request.customerName}</h4>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-800 text-slate-400 rounded-lg"><Mail size={16} /></div>
                <div className="overflow-hidden">
                  <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Email</p>
                  <h4 className="text-xs font-bold text-slate-300 truncate">{request.email}</h4>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-800 text-slate-400 rounded-lg"><Calendar size={16} /></div>
                <div>
                  <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Submitted</p>
                  <h4 className="text-xs font-bold text-slate-300">{new Date(request.createdAt).toLocaleString()}</h4>
                </div>
              </div>
            </div>

            {/* Message Body */}
            <div>
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-1">
                <MessageSquare size={12} className="text-brand-400" />
                Original Message ({request.channel})
              </h3>
              <div className="p-5 bg-slate-950/40 border border-slate-900 rounded-2xl text-slate-300 text-sm leading-relaxed whitespace-pre-line font-sans">
                {request.message}
              </div>
            </div>
          </section>

          {/* AI classification container */}
          <section className="glass-panel p-6 sm:p-8 rounded-3xl space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-800/60 pb-5">
              <div className="p-2.5 bg-brand-500/10 text-brand-400 rounded-xl">
                <Cpu size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">AI Classification Analysis</h3>
                <p className="text-xs text-slate-400">Mock classification worker analysis based on NLP keywords</p>
              </div>
            </div>

            {!request.classification ? (
              <div className="p-6 text-center border border-dashed border-slate-850 rounded-2xl bg-slate-950/20">
                <div className="w-8 h-8 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin mx-auto mb-3"></div>
                <h4 className="text-sm font-bold text-slate-400">Awaiting AI Analysis</h4>
                <p className="text-[11px] text-slate-500 max-w-xs mx-auto mt-1">
                  The background worker is currently parsing the request queue. This takes approximately 2-3 seconds.
                </p>
              </div>
            ) : request.classification.errorState ? (
              <div className="p-5 rounded-2xl bg-rose-500/5 border border-rose-500/20 flex gap-4 text-rose-300">
                <AlertTriangle size={24} className="flex-shrink-0" />
                <div>
                  <h4 className="text-sm font-bold">Classification Execution Failed</h4>
                  <p className="text-xs text-rose-400/80 mt-1">{request.classification.reason}</p>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                
                {/* Badges and Gauge Row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div className="bg-slate-950/80 border border-slate-900 p-4 rounded-2xl flex flex-col justify-between">
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Category</span>
                    <span className="text-base font-bold text-slate-200 mt-2 block">{request.classification.category}</span>
                  </div>
                  
                  <div className="bg-slate-950/80 border border-slate-900 p-4 rounded-2xl flex flex-col justify-between">
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Routing Priority</span>
                    <span className={`inline-block text-xs font-bold text-center px-2.5 py-1 rounded-full border max-w-max mt-2 ${getPriorityColor(request.classification.priority)}`}>
                      {request.classification.priority}
                    </span>
                  </div>

                  <div className="bg-slate-950/80 border border-slate-900 p-4 rounded-2xl">
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Confidence Score</span>
                    <div className="flex items-center gap-3 mt-2">
                      <div className="flex-1 bg-slate-900 rounded-full h-2 border border-slate-800">
                        <div 
                          className="bg-brand-500 h-full rounded-full" 
                          style={{ width: `${request.classification.confidence * 100}%` }}
                        />
                      </div>
                      <span className="text-sm font-extrabold text-slate-300">{Math.round(request.classification.confidence * 100)}%</span>
                    </div>
                  </div>
                </div>

                {/* Summarized content */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">AI Generated Summary</h4>
                  <div className="p-4 bg-slate-950/60 border border-slate-900 rounded-2xl text-xs font-bold text-slate-200 leading-relaxed font-sans italic">
                    "{request.classification.summary}"
                  </div>
                </div>

                {/* Logic explanation */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Classification Reasoning</h4>
                  <p className="text-xs text-slate-400 leading-relaxed bg-slate-950/20 p-4 rounded-2xl border border-slate-900">
                    {request.classification.reason}
                  </p>
                </div>
              </div>
            )}
          </section>
        </div>

        {/* Right Side: Timeline & Internal Notes (1/3 column) */}
        <div className="space-y-6">
          
          {/* Internal Notes container */}
          <section className="glass-panel p-6 rounded-3xl flex flex-col h-[400px]">
            <h3 className="text-sm font-bold text-white border-b border-slate-800/60 pb-3 mb-4 flex items-center gap-2">
              <FileText size={16} className="text-brand-400" />
              Internal Notes
            </h3>

            {/* Notes scroll container */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1 mb-4">
              {!request.notes || request.notes.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-4">
                  <span className="text-slate-700 text-xs">No internal notes added.</span>
                </div>
              ) : (
                request.notes.map((note) => (
                  <div key={note.id} className="p-3.5 bg-slate-950/80 border border-slate-900 rounded-2xl space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] text-slate-500">
                      <span className="font-bold text-slate-300 flex items-center gap-1">
                        <Shield size={10} className="text-brand-400" />
                        {note.author.name} ({note.author.role})
                      </span>
                      <span>
                        {new Date(note.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed font-sans">{note.note}</p>
                  </div>
                ))
              )}
              <div ref={notesEndRef} />
            </div>

            {/* Add note form (Admins only) */}
            {user?.role === 'ADMIN' && (
              <form onSubmit={handleAddNote} className="relative mt-auto border-t border-slate-850 pt-3 flex gap-2">
                <input
                  type="text"
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Type internal note..."
                  className="flex-1 py-2.5 pl-3.5 pr-10 bg-slate-950/80 border border-slate-800 rounded-xl text-xs focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 placeholder-slate-600 text-slate-100"
                />
                <button
                  type="submit"
                  disabled={submittingNote || !newNote.trim()}
                  className="p-2.5 bg-brand-500 hover:bg-brand-600 rounded-xl text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  title="Send Note"
                >
                  {submittingNote ? (
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <Send size={14} />
                  )}
                </button>
              </form>
            )}
          </section>

          {/* Timeline Audit Logs container */}
          <section className="glass-panel p-6 rounded-3xl">
            <h3 className="text-sm font-bold text-white border-b border-slate-800/60 pb-3 mb-4 flex items-center gap-2">
              <History size={16} className="text-brand-400" />
              Event Timeline
            </h3>

            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
              {!request.events || request.events.length === 0 ? (
                <span className="text-slate-700 text-xs block text-center py-4">No logged events.</span>
              ) : (
                request.events.map((evt) => {
                  let metadataObj: any = {};
                  try {
                    metadataObj = evt.metadata ? JSON.parse(evt.metadata) : {};
                  } catch (e) {
                    metadataObj = { raw: evt.metadata };
                  }

                  return (
                    <div key={evt.id} className="flex gap-3 text-xs">
                      {/* Vertical line indicator */}
                      <div className="flex flex-col items-center flex-shrink-0">
                        <div className="w-2.5 h-2.5 rounded-full bg-slate-800 border border-slate-700 flex-shrink-0" />
                        <div className="w-0.5 flex-1 bg-slate-850 mt-1" />
                      </div>
                      
                      {/* Timeline message */}
                      <div className="pb-3 flex-1">
                        <div className="flex items-center justify-between text-[10px] text-slate-500">
                          <span className="font-semibold">{evt.eventType}</span>
                          <span>
                            {new Date(evt.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        
                        <p className="text-slate-300 mt-1 font-sans">
                          {evt.eventType === 'CREATED' && `Ticket submitted by ${request.customerName} via ${request.channel}.`}
                          {evt.eventType === 'QUEUED' && 'Placed in background AI processing queue.'}
                          {evt.eventType === 'CLASSIFIED' && `AI classified category as ${metadataObj.category} and priority as ${metadataObj.priority}.`}
                          {evt.eventType === 'STATUS_CHANGE' && `Status changed from ${evt.oldStatus} to ${evt.newStatus} by ${metadataObj.actorName || 'System'}.`}
                          {evt.eventType === 'NOTE_ADDED' && `Note appended by ${metadataObj.authorName || 'Agent'}.`}
                          {evt.eventType === 'ERROR' && `AI classification error: ${metadataObj.error || 'System fault'}.`}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

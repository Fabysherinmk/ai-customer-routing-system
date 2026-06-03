export type RequestStatus = 'NEW' | 'QUEUED' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'AGENT';
}

export interface Classification {
  id: string;
  requestId: string;
  provider: string;
  category: 'Billing' | 'Technical Support' | 'Sales' | 'General Inquiry';
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  summary: string;
  confidence: number;
  reason: string;
  errorState: boolean;
  createdAt: string;
}

export interface Note {
  id: string;
  requestId: string;
  note: string;
  createdAt: string;
  author: {
    name: string;
    role: string;
  };
}

export interface RequestEvent {
  id: string;
  requestId: string;
  eventType: string;
  oldStatus?: string;
  newStatus?: string;
  metadata?: string;
  createdAt: string;
  actor?: {
    name: string;
    role: string;
  };
}

export interface CustomerRequest {
  id: string;
  customerName: string;
  email: string;
  channel: 'email' | 'whatsapp' | 'webform' | 'chat';
  message: string;
  status: RequestStatus;
  assignedToId?: string;
  assignedTo?: User;
  createdAt: string;
  updatedAt: string;
  classification?: Classification;
  notes?: Note[];
  events?: RequestEvent[];
}

export interface DashboardMetrics {
  total: number;
  new: number;
  inProgress: number;
  resolved: number;
  queued: number;
}

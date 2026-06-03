export type RequestStatus = 'NEW' | 'QUEUED' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';

export interface AIClassificationResult {
  category: 'Billing' | 'Technical Support' | 'Sales' | 'General Inquiry';
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  confidence: number;
  summary: string;
  reason: string;
  rawOutput?: string;
}

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  name: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

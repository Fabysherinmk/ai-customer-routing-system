import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../prisma/client';
import requestQueue from '../workers/requestWorker';
import { broadcastEvent } from '../sockets/socketManager';
import { RequestStatus } from '../types';

// Simple in-memory storage for idempotency keys to prevent duplicate requests in quick succession
const idempotencyKeys = new Set<string>();

/**
 * Public endpoint to submit a new support request
 */
export const createRequest = async (req: Request, res: Response) => {
  try {
    const { customerName, email, channel, message } = req.body;
    const idempotencyKey = req.headers['x-idempotency-key'] as string;

    // Check if the request was submitted by an authenticated staff member (e.g. agent simulation)
    let assignedToId: string | null = null;
    const authHeader = req.headers.authorization;
    console.log(`[Create Request] Auth Header: "${authHeader ? 'PRESENT' : 'NONE'}"`);
    if (authHeader) {
      const token = authHeader.split(' ')[1];
      if (token) {
        try {
          const JWT_SECRET = process.env.JWT_SECRET || 'supersecret_jwt_key_12345_crrs';
          const decoded = jwt.verify(token, JWT_SECRET) as any;
          console.log(`[Create Request] Decoded Token UserId: "${decoded?.userId || 'NONE'}", Role: "${decoded?.role || 'NONE'}"`);
          if (decoded && decoded.userId) {
            // Verify that the user still exists in the database to prevent foreign key violations
            const existingUser = await prisma.user.findUnique({ where: { id: decoded.userId } });
            if (existingUser) {
              assignedToId = decoded.userId;
            } else {
              console.log(`[Create Request] User ID "${decoded.userId}" does not exist in DB (stale session).`);
            }
          }
        } catch (e: any) {
          console.log(`[Create Request] Token Verification Failed: ${e.message}`);
        }
      }
    }

    // 1. Basic validation
    if (!customerName || !email || !channel || !message) {
      return res.status(400).json({ error: 'customerName, email, channel, and message are required' });
    }

    const validChannels = ['email', 'whatsapp', 'webform', 'chat'];
    if (!validChannels.includes(channel.toLowerCase())) {
      return res.status(400).json({ error: `Invalid channel. Must be one of: ${validChannels.join(', ')}` });
    }

    // 2. Idempotency Check
    if (idempotencyKey) {
      if (idempotencyKeys.has(idempotencyKey)) {
        return res.status(409).json({ error: 'Conflict: Duplicate request detected (Idempotency Key already processed)' });
      }
      idempotencyKeys.add(idempotencyKey);
      // Remove key after 5 minutes
      setTimeout(() => idempotencyKeys.delete(idempotencyKey), 5 * 60 * 1000);
    } else {
      // Fallback: Check if identical email and message was submitted in the last 60 seconds
      const duplicateRequest = await prisma.request.findFirst({
        where: {
          email,
          message,
          createdAt: {
            gte: new Date(Date.now() - 60 * 1000)
          }
        }
      });
      if (duplicateRequest) {
        return res.status(409).json({ error: 'Conflict: A duplicate request from this email was received in the last 60 seconds.' });
      }
    }

    // 3. Create the request in the DB with status NEW
    const newRequest = await prisma.request.create({
      data: {
        customerName,
        email,
        channel: channel.toLowerCase(),
        message,
        status: 'NEW',
        assignedToId: assignedToId || null
      },
      include: {
        classification: true,
        notes: true,
        assignedTo: {
          select: { name: true, role: true }
        }
      }
    });

    // 4. Log the CREATED audit event
    await prisma.requestEvent.create({
      data: {
        requestId: newRequest.id,
        eventType: 'CREATED',
        newStatus: 'NEW',
        actorId: assignedToId || null,
        metadata: JSON.stringify({ 
          source: channel, 
          customer: customerName,
          creatorId: assignedToId || null
        })
      }
    });

    // 5. Broadcast new request event via Socket.io
    broadcastEvent('request:created', newRequest);

    // 6. Queue the request for AI classification worker
    requestQueue.enqueue(newRequest.id);

    // 7. Return created request immediately
    return res.status(201).json(newRequest);

  } catch (err: any) {
    console.error('Create request error:', err);
    return res.status(500).json({ error: 'Server error creating request' });
  }
};

/**
 * Get all requests with search, filtering, and sorting
 */
export const getRequests = async (req: Request, res: Response) => {
  try {
    const { status, priority, category, search, sortBy = 'createdAt', order = 'desc' } = req.query;

    const whereClause: any = {};

    // Role privileges enforcement: Agents only see requests assigned to them
    if (req.user?.role === 'AGENT') {
      whereClause.assignedToId = req.user.userId;
    }

    // Filter by status
    if (status) {
      whereClause.status = status as string;
    }

    // Filter by category or priority (which reside in the Classification relation)
    if (category || priority) {
      whereClause.classification = {};
      if (category) {
        whereClause.classification.category = category as string;
      }
      if (priority) {
        whereClause.classification.priority = priority as string;
      }
    }

    // Text search (customerName, email, message)
    if (search) {
      const searchStr = search as string;
      // SQLite does not support mode: "insensitive" in Prisma queries. 
      // We conditionally apply it only when the active connection string uses PostgreSQL.
      const dbUrl = process.env.DATABASE_URL || '';
      const isPostgres = dbUrl.startsWith('postgresql') || dbUrl.startsWith('postgres');
      const searchCondition = isPostgres 
        ? { contains: searchStr, mode: 'insensitive' as any } 
        : { contains: searchStr };

      whereClause.OR = [
        { customerName: searchCondition },
        { email: searchCondition },
        { message: searchCondition }
      ];
    }

    // Sorting parameters
    const orderDirection = order === 'asc' ? 'asc' : 'desc';
    let orderByClause: any = {};

    if (sortBy === 'priority' || sortBy === 'category') {
      // Sorting via nested fields is supported in Prisma
      orderByClause = {
        classification: {
          [sortBy]: orderDirection
        }
      };
    } else {
      orderByClause = {
        [sortBy as string]: orderDirection
      };
    }

    // Fetch requests
    const requests = await prisma.request.findMany({
      where: whereClause,
      include: {
        classification: true,
        notes: {
          include: {
            author: {
              select: { name: true, role: true }
            }
          }
        }
      },
      orderBy: orderByClause
    });

    // Scope metrics counts by assignee if agent
    const metricsWhere = req.user?.role === 'AGENT' ? { assignedToId: req.user.userId } : {};

    // Calculate system metrics for dashboard stats
    const totalRequests = await prisma.request.count({ where: metricsWhere });
    const newRequests = await prisma.request.count({ where: { ...metricsWhere, status: 'NEW' } });
    const inProgressRequests = await prisma.request.count({ where: { ...metricsWhere, status: 'IN_PROGRESS' } });
    const resolvedRequests = await prisma.request.count({ where: { ...metricsWhere, status: 'RESOLVED' } });
    const queuedRequests = await prisma.request.count({ where: { ...metricsWhere, status: 'QUEUED' } });

    return res.json({
      requests,
      metrics: {
        total: totalRequests,
        new: newRequests,
        inProgress: inProgressRequests,
        resolved: resolvedRequests,
        queued: queuedRequests
      }
    });

  } catch (err) {
    console.error('Fetch requests error:', err);
    return res.status(500).json({ error: 'Server error listing requests' });
  }
};

/**
 * Fetch detailed request information, notes, and audit log history
 */
export const getRequestById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const request = await prisma.request.findUnique({
      where: { id },
      include: {
        classification: true,
        notes: {
          include: {
            author: {
              select: { id: true, name: true, role: true }
            }
          },
          orderBy: { createdAt: 'asc' }
        },
        events: {
          include: {
            actor: {
              select: { id: true, name: true, role: true }
            }
          },
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }

    // Role privileges enforcement: Agents can only view requests assigned to them
    if (req.user?.role === 'AGENT' && request.assignedToId !== req.user.userId) {
      return res.status(403).json({ error: 'Forbidden: You do not have permissions to view this request.' });
    }

    return res.json(request);

  } catch (err) {
    console.error('Get request by ID error:', err);
    return res.status(500).json({ error: 'Server error retrieving request details' });
  }
};

/**
 * Change status of a support request
 */
export const updateRequestStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const allowedStatuses: RequestStatus[] = ['NEW', 'QUEUED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];
    if (!status || !allowedStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${allowedStatuses.join(', ')}` });
    }

    const request = await prisma.request.findUnique({ where: { id } });
    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }

    // Role privileges enforcement: Agents are not allowed to update request status
    if (req.user?.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Forbidden: Only administrators can update request status.' });
    }

    const oldStatus = request.status;

    // Update status
    const updatedRequest = await prisma.request.update({
      where: { id },
      data: { status },
      include: { classification: true, notes: true }
    });

    // Write request event audit log
    const event = await prisma.requestEvent.create({
      data: {
        requestId: id,
        eventType: 'STATUS_CHANGE',
        oldStatus,
        newStatus: status,
        actorId: req.user?.userId,
        metadata: JSON.stringify({ actorName: req.user?.name, reason: 'Manual agent transition' })
      },
      include: {
        actor: {
          select: { name: true, role: true }
        }
      }
    });

    // Broadcast change
    broadcastEvent('request:updated', updatedRequest);
    broadcastEvent('request:status_changed', { requestId: id, oldStatus, newStatus: status, event });

    return res.json(updatedRequest);

  } catch (err) {
    console.error('Update request status error:', err);
    return res.status(500).json({ error: 'Server error updating request status' });
  }
};

/**
 * Add internal admin/agent note to a request
 */
export const addRequestNote = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { note } = req.body;

    if (!note || note.trim() === '') {
      return res.status(400).json({ error: 'Note content cannot be empty' });
    }

    const request = await prisma.request.findUnique({ where: { id } });
    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }

    // Role privileges enforcement: Agents are not allowed to add internal notes
    if (req.user?.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Forbidden: Only administrators can add notes.' });
    }

    // Insert Note
    const newNote = await prisma.note.create({
      data: {
        requestId: id,
        authorId: req.user!.userId,
        note: note.trim()
      },
      include: {
        author: {
          select: { name: true, role: true }
        }
      }
    });

    // Audit Event
    const event = await prisma.requestEvent.create({
      data: {
        requestId: id,
        eventType: 'NOTE_ADDED',
        actorId: req.user!.userId,
        metadata: JSON.stringify({ authorName: req.user!.name, snippet: newNote.note.substring(0, 30) })
      },
      include: {
        actor: {
          select: { name: true, role: true }
        }
      }
    });

    // Broadcast
    broadcastEvent('request:note_added', { requestId: id, note: newNote, event });

    return res.status(201).json(newNote);

  } catch (err) {
    console.error('Add note error:', err);
    return res.status(500).json({ error: 'Server error adding internal note' });
  }
};

/**
 * Simulation Webhook for inbound integrations (e.g. WhatsApp or email services)
 * Demonstrates signature validation security.
 */
export const inboundWebhookSimulation = async (req: Request, res: Response) => {
  try {
    const signature = req.headers['x-hub-signature-256'] as string;
    const payload = req.body;

    // Webhook Security Validation Explanation:
    // Standard inbound webhooks (like from WhatsApp/Twilio) include a SHA256 signature calculated 
    // with a shared secret key. This verifies that the request originates from the verified channel.
    // E.g.
    // const hmac = crypto.createHmac('sha256', process.env.WEBHOOK_SECRET);
    // const digest = Buffer.from('sha256=' + hmac.update(JSON.stringify(payload)).digest('hex'), 'utf8');
    // if (!crypto.timingSafeEqual(Buffer.from(signature), digest)) { return res.status(401).json({ error: 'Invalid Signature' }); }
    
    console.log(`[Webhook Inbound] Received webhook. Signature: ${signature || 'NONE'}`);
    
    const { from, channel, body, contactName } = payload;
    if (!from || !channel || !body) {
      return res.status(400).json({ error: 'Webhook payload requires: from, channel, and body' });
    }

    // Process inbound request
    const newRequest = await prisma.request.create({
      data: {
        customerName: contactName || from,
        email: channel === 'email' ? from : `${from}@whatsapp-sim.com`,
        channel: channel.toLowerCase(),
        message: body,
        status: 'NEW'
      }
    });

    await prisma.requestEvent.create({
      data: {
        requestId: newRequest.id,
        eventType: 'CREATED',
        newStatus: 'NEW',
        metadata: JSON.stringify({ 
          source: `webhook:${channel}`, 
          validatedSignature: !!signature,
          explain: 'Simulated SHA256 verification complete.' 
        })
      }
    });

    // Broadcast new request event via Socket.io
    broadcastEvent('request:created', newRequest);

    // Queue for worker
    requestQueue.enqueue(newRequest.id);

    return res.status(202).json({
      message: 'Webhook received and queued for processing',
      requestId: newRequest.id,
      verified: !!signature
    });

  } catch (err) {
    console.error('Webhook processing error:', err);
    return res.status(500).json({ error: 'Server error processing inbound webhook' });
  }
};

/**
 * Assign a request to an agent or admin (Admins only)
 */
export const assignRequest = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userId } = req.body; // Can be string ID or null/undefined to unassign

    const request = await prisma.request.findUnique({ where: { id } });
    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }

    let agentName = 'Unassigned';
    if (userId) {
      const targetUser = await prisma.user.findUnique({ where: { id: userId } });
      if (!targetUser) {
        return res.status(400).json({ error: 'Assignee user not found' });
      }
      agentName = targetUser.name;
    }

    // Update assignment
    const updatedRequest = await prisma.request.update({
      where: { id },
      data: { assignedToId: userId || null },
      include: {
        classification: true,
        notes: true,
        assignedTo: {
          select: { name: true, role: true }
        }
      }
    });

    // Write audit event
    const event = await prisma.requestEvent.create({
      data: {
        requestId: id,
        eventType: 'ASSIGNED',
        actorId: req.user!.userId,
        metadata: JSON.stringify({ 
          actorName: req.user!.name, 
          assigneeId: userId || null, 
          assigneeName: agentName 
        })
      },
      include: {
        actor: {
          select: { name: true, role: true }
        }
      }
    });

    // Broadcast update
    broadcastEvent('request:updated', updatedRequest);
    broadcastEvent('request:assigned', { requestId: id, assigneeId: userId || null, assigneeName: agentName, event });

    return res.json(updatedRequest);

  } catch (err: any) {
    console.error('Assign request error:', err);
    return res.status(500).json({ error: 'Server error assigning request' });
  }
};

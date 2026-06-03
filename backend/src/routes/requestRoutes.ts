import { Router } from 'express';
import { 
  createRequest, 
  getRequests, 
  getRequestById, 
  updateRequestStatus, 
  addRequestNote,
  inboundWebhookSimulation,
  assignRequest
} from '../controllers/requestController';
import { createUser, getUsers } from '../controllers/userController';
import { authenticateJWT, authorizeRoles } from '../middleware/authMiddleware';
import rateLimit from 'express-rate-limit';

const router = Router();

// Rate limiting for public endpoints to prevent abuse
const publicIntakeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: { error: 'Too many requests from this IP, please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Public customer request submission
router.post('/requests', publicIntakeLimiter, createRequest);

// Simulated channel webhook (public, but rate-limited)
router.post('/webhooks/inbound', publicIntakeLimiter, inboundWebhookSimulation);

// Protected admin/agent endpoints
router.get('/requests', authenticateJWT, getRequests);
router.get('/requests/:id', authenticateJWT, getRequestById);
router.patch('/requests/:id/status', authenticateJWT, updateRequestStatus);
router.post('/requests/:id/notes', authenticateJWT, addRequestNote);

// User assignment & creation endpoints (Protected)
router.patch('/requests/:id/assign', authenticateJWT, authorizeRoles('ADMIN'), assignRequest);
router.post('/users', authenticateJWT, authorizeRoles('ADMIN'), createUser);
router.get('/users', authenticateJWT, getUsers);

export default router;

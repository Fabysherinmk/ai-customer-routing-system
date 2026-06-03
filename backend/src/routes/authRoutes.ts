import { Router } from 'express';
import { login, getMe } from '../controllers/authController';
import { authenticateJWT } from '../middleware/authMiddleware';

const router = Router();

router.post('/login', login);
router.get('/me', authenticateJWT, getMe);

export default router;

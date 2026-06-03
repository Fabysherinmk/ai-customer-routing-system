import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes';
import requestRoutes from './routes/requestRoutes';
import { initSocket } from './sockets/socketManager';
import { setupSwagger } from './swagger';

// Load environment variables
dotenv.config();

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 5000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// 1. Initialize Realtime Sockets
initSocket(httpServer, FRONTEND_URL);

// 2. Middlewares
app.use(cors({
  origin: [FRONTEND_URL, 'http://localhost:5173', 'http://localhost:3000'],
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 3. API Routes
app.use('/api/auth', authRoutes);
app.use('/api', requestRoutes);

// 4. Setup Swagger Documentation
setupSwagger(app);

// 5. Health Check Endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date(), 
    environment: process.env.NODE_ENV || 'development' 
  });
});

// 6. Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled Error:', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

// 7. Start Listening
httpServer.listen(PORT, () => {
  console.log(`==================================================`);
  console.log(` CRRS Server is running on port ${PORT}`);
  console.log(` Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(` Socket CORS Origin: ${FRONTEND_URL}`);
  console.log(`==================================================`);
});

export default app;

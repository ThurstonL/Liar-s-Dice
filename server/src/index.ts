import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { setupSocketHandlers } from './socket/handlers.js';
import type { ClientToServerEvents, ServerToClientEvents } from '../../shared/types.js';

const app = express();
const httpServer = createServer(app);

// Configure CORS for development
const allowedOrigins = process.env.CLIENT_URL || 'http://localhost:5173';

app.use(cors({
    origin: allowedOrigins,
    credentials: true,
}));

app.use(express.json());

// Health check endpoint
app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Socket.IO server with typed events
const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
    cors: {
        origin: allowedOrigins,
        methods: ['GET', 'POST'],
        credentials: true,
    },
});

// Set up socket event handlers
setupSocketHandlers(io);

const PORT = process.env.PORT || 3001;

httpServer.listen(PORT, () => {
    console.log(`🎲 Liar's Dice server running on port ${PORT}`);
});

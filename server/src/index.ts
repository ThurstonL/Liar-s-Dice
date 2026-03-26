import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { setupSocketHandlers } from './socket/handlers.js';
import type { ClientToServerEvents, ServerToClientEvents } from '../../shared/types.js';

const app = express();
const httpServer = createServer(app);

// Configure CORS for development to allow local network access
const corsOptions = {
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);

        // Allow localhost and local network IPs
        if (origin.startsWith('http://localhost') ||
            origin.startsWith('http://127.0.0.1') ||
            origin.startsWith('http://192.168.') ||
            origin.startsWith('http://10.')) {
            return callback(null, true);
        }

        return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
};

app.use(cors(corsOptions));

app.use(express.json());

// Health check endpoint
app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Socket.IO server with typed events
const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
    cors: {
        origin: corsOptions.origin,
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

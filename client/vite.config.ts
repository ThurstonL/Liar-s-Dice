import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const extraAllowedHosts = (process.env.ALLOWED_HOSTS ?? '')
    .split(',')
    .map((host) => host.trim())
    .filter(Boolean);

export default defineConfig({
    plugins: [react()],
    server: {
        allowedHosts: [
            'app.mitoful.com',
            'liarsdice.thepregames.com',
            ...extraAllowedHosts,
        ],
        port: 5173,
        proxy: {
            '/socket.io': {
                target: 'http://localhost:3001',
                ws: true,
            },
        },
    },
});

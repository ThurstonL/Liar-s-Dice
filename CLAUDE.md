# Liar's Dice

Multiplayer real-time dice game. npm workspace monorepo: `client/`, `server/`, `shared/`.

## Commands (from liars-dice/ root)

```bash
npm run dev           # client + server concurrently
npm run build         # shared → client → server (order matters)
npm run dev:client    # Vite dev server only (port 5173)
npm run dev:server    # Node server with tsx watch (port 3001)
npm start             # Production server
```

## Gotchas

- `shared/types.ts` is the single source of truth for Socket.io event names + payloads. **Change it first** when modifying any event contract, then rebuild `shared/` before client/server.
- Build order matters: `shared` → `client` → `server`. `npm run build` handles this; manual builds must follow it.
- Client socket is a **module-level singleton** (`client/src/hooks/useSocket.ts`) — don't construct sockets inside components, or you'll get duplicate connections on re-render.
- Production socket URL comes from `VITE_SOCKET_URL` env var in `client/.env.production`.

For full architecture, see @docs/architecture.md

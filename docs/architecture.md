# Liar's Dice Architecture

`shared/types.ts` is the single source of truth for all Socket.io event names and payload shapes — update it first when changing any event contract. The compiled output (`types.js`, `types.d.ts`) must be rebuilt before client or server builds.

## Server-side

- `server/src/engine/GameRoom.ts` — authoritative game state per room; all mutation goes through its methods; implements the FSM: `LOBBY → ROLL → BIDDING → REVEAL → GAME_END`.
- `server/src/engine/RoomManager.ts` — singleton that maps roomCode↔roomId and socket↔player↔room; handles reconnect tracking.
- `server/src/socket/handlers.ts` — Socket.io event handlers; thin — delegates all logic to `GameRoom`/`RoomManager`.
- CORS allows localhost/LAN automatically; production origins are hardcoded in `server/src/index.ts` plus `ALLOWED_ORIGINS` env var override.

## Client-side

- `client/src/hooks/useSocket.ts` — manages a **module-level singleton socket** (prevents duplicate connections on re-render); on connect, auto-attempts session restore from `localStorage`; all game actions are exposed as typed callbacks.
- `client/src/store/gameStore.ts` — Zustand store; holds `publicState` (broadcast to all) and `privateState` (per-player dice + turn flags); pre-built selector hooks (`useIsMyTurn`, `useMyDice`, `useGamePhase`, etc.) should be used rather than selecting from the store directly.
- Socket URL is resolved at module init time in `useSocket.ts`: dev uses `hostname:3001`, production uses `VITE_SOCKET_URL` env var (set in `client/.env.production`).

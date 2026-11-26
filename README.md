# Red Tetris

Real-time multiplayer Tetris. Everyone in a room gets the same pieces, sees each other's spectrums, and the last player standing wins. Clearing several lines at once sends red lines to everyone else.

Built with TypeScript, React and Redux on the client, and Node.js, Express and socket.io on the server.

## Getting started

Needs Node.js 24.

```sh
npm install
cp .env.example .env   # optional: the server defaults to port 3000
npm start              # builds the client, then serves everything on http://localhost:3000
```

Open `http://localhost:3000/<room>/<name>` in a few browser windows, for example `/pelicans/alice` and `/pelicans/bob`. You can also use the home page form. The first player to join is the host and starts each round. A room with one player is a solo game.

### Controls

| Key | Action |
|---|---|
| ← → | Move |
| ↑ | Rotate |
| ↓ | Soft drop |
| Space | Hard drop |

### Configuration

Settings come from a `.env` file at the repo root, which is gitignored. Copy `.env.example` to start.

| Variable | Default | Used by |
|---|---|---|
| `PORT` | `3000` | The game server, and the Vite dev server's socket.io proxy |

## Scripts

| Command | What it does |
|---|---|
| `npm start` | Build the client into `dist/` and start the server |
| `npm run dev` | Start the server and restart it on changes |
| `npm run dev:client` | Start the Vite dev server on http://localhost:5173 with hot reload. It proxies socket.io to the game server, so run `npm run dev` too. |
| `npm run build` | Build `dist/index.html` and `dist/bundle.js` |
| `npm test` | Run the tests |
| `npm run coverage` | Run the tests with coverage. Fails under 70% statements, functions and lines, or 50% branches. |
| `npm run typecheck` | Type-check everything |

CI runs the typecheck, coverage and build on every pull request.

## How it works

```
src/
  shared/   Pure board and piece functions, used by both sides
  server/   Express + socket.io: rooms, piece dealing, relaying
  client/   React + Redux single-page app
tests/      Unit tests per module, plus end-to-end tests (tests/e2e.test.ts)
```

**Responsibilities:**
- **Each client** runs its own board: gravity, moves, rotation, locking, line clears and penalties.
- **The server** manages rooms and the host, deals one shared piece sequence per round, relays spectrums and red lines, tracks who is out, and decides when the round ends.

**Shared** (`src/shared`): pure functions for the 10×20 board, the 7 pieces and their rotations, moves, line clears, red lines and spectrums. Pieces come in shuffled bags of 7.

**Server** (`src/server`): classes, as the subject asks.
- `Game` is one room: its players, host, round state and results.
- `Player` is one connection in a room.
- `Piece` is the round's piece sequence, extended on demand. Every player reads from the same list, so everyone gets the same pieces in the same order.
- `app.ts` serves the built client for `/` and `/:room/:player`, and maps socket events onto these classes.

**Client** (`src/client`): written without `this`, using function components, hooks and closures. Layouts use CSS grid and flexbox, with no tables, canvas or SVG.
- `game/engine.ts`: pure state functions for one player's game (spawn, move, rotate, tick, drop, penalties).
- `store/`: Redux Toolkit slices for the room and the game, plus a socket middleware that turns server messages into actions and reports the player's board back to the server.
- `pages/`: home, lobby, game and game-over screens, picked by the round's phase. The room and name come from the URL through React Router.

## Network protocol

All messages go over socket.io. The types are in `src/client/store/protocol.ts`.

| Message | Direction | Data | Meaning |
|---|---|---|---|
| `joinRoom` | Client → Server | `{ room, player }` | Join or create a room. Refused while a round is running, or if the name is taken. |
| `startGame` | Client → Server | – | The host starts a round, or the next one |
| `requestPieces` | Client → Server | `{ from }` | Send the shared sequence from index `from`. The client asks when fewer than 7 pieces are queued. |
| `boardChanged` | Client → Server | `{ spectrum }` | A piece locked; pass the column heights on to the opponents |
| `linesCleared` | Client → Server | `{ count }` | Send `count - 1` red lines to each opponent still playing |
| `lost` | Client → Server | – | The player topped out |
| `roomUpdate` | Server → room | `{ host, players }` | Someone joined or left, or the host changed |
| `joinError` | Server → player | message | Why `joinRoom` was refused |
| `gameStarted` | Server → room | `{ pieces }` | A new round, with the first pieces. Clients reset their board and results. |
| `pieces` | Server → player | `{ pieces }` | Answer to `requestPieces` |
| `spectrum` | Server → room | `{ name, spectrum }` | An opponent's column heights |
| `penalty` | Server → player | `{ lines, from }` | Red lines to add, and who sent them |
| `playerOut` | Server → room | `{ name }` | Someone lost |
| `gameOver` | Server → room | `{ winner, lost }` | The round is over. `winner` is `null` in solo; `lost` lists who lost, first out first. |

When a round ends, the room goes back to waiting: new players may join, and the host sends `startGame` again to play the next round.

## Testing

- **Shared and server:** unit tests for the board, pieces, moves and each class, plus socket tests with real socket.io clients against the server.
- **Client:** the engine and reducers are tested directly. The middleware is tested against a fake socket, and the pages in jsdom with Testing Library.
- **End to end:** `tests/e2e.test.ts` runs real client stores against the real server. It covers joining, the host-only start, identical pieces, refusing late joiners, a two-line clear sending one red line, a round ending and restarting, and the host leaving. It stubs `Math.random`, so the piece order is fixed.

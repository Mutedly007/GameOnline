# Bent w Weld — بنت و ولد

A real-time multiplayer Tunisian category & letter game built with **Next.js**, **NestJS**, and **Socket.IO**.

## 🎮 How to Play

1. **Create a lobby** — A room code and QR code are generated
2. **Share** — Players join via room code, link, or QR scan
3. **Play** — A random letter is shown, fill in 6 categories starting with that letter
4. **Review** — After the timer ends, vote on invalid answers
5. **Score** — Unique answer = 10pts, Duplicate = 5pts, Invalid = 0pts

### Categories
| Category | Arabic |
|----------|--------|
| Girl Name (Bent) | بنت |
| Boy Name (Weld) | ولد |
| Job | خدمة |
| Famous Person | مشهور |
| Vegetable | خضرة |
| Object (Jamad) | جماد |

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** 18+ installed
- Two terminal windows

### 1. Backend (NestJS)

```bash
cd backend
npm install
npm run start:dev
```
Server runs on `http://localhost:3001`

### 2. Frontend (Next.js)

```bash
cd frontend
npm install
npm run dev
```
App runs on `http://localhost:3000`

### 3. Play!
- Open `http://localhost:3000` in browser tab 1 → Create a game
- Open the same URL in tab 2 → Join with the room code
- Host starts the game → Play!

---

## 📁 Project Structure

```
├── backend/                 # NestJS server
│   └── src/
│       ├── main.ts          # App bootstrap (port 3001, CORS)
│       ├── app.module.ts    # Root module
│       ├── lobby/
│       │   ├── lobby.gateway.ts   # Socket.IO WebSocket gateway
│       │   ├── lobby.service.ts   # In-memory lobby management
│       │   └── lobby.module.ts
│       └── game/
│           ├── game.types.ts      # TypeScript interfaces
│           ├── game.service.ts    # Letter gen, validation, scoring
│           └── game.module.ts
│
├── frontend/                # Next.js app
│   └── src/
│       ├── lib/
│       │   ├── socket.ts    # Socket.IO client singleton
│       │   └── types.ts     # Shared types & categories
│       └── app/
│           ├── page.tsx           # Home (create/join)
│           ├── lobby/[roomCode]/  # Lobby (QR, players)
│           ├── game/[roomCode]/   # Game (timer, inputs)
│           └── results/[roomCode]/ # Results (voting, scores)
```

---

## 🔌 WebSocket Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `createLobby` | Client → Server | Create new room |
| `joinLobby` | Client → Server | Join existing room |
| `lobbyCreated` | Server → Client | Room created response |
| `lobbyJoined` | Server → Client | Join confirmed |
| `playerJoined` | Server → Room | New player notification |
| `playerLeft` | Server → Room | Player disconnected |
| `startGame` | Client → Server | Host starts round |
| `gameStarted` | Server → Room | Round begins (letter + timer) |
| `timerUpdate` | Server → Room | Timer tick (every 1s) |
| `submitAnswers` | Client → Server | Player submits answers |
| `playerSubmitted` | Server → Room | Submission count |
| `endRound` | Server → Room | Timer expired / all submitted |
| `voteAnswer` | Client → Server | Vote answer invalid |
| `voteUpdated` | Server → Room | Vote count updated |
| `finishVoting` | Client → Server | Host finalizes votes |
| `roundResults` | Server → Room | Scores calculated |
| `nextRound` | Client → Server | Host starts next round |
| `gameFinished` | Server → Room | All rounds complete |

---
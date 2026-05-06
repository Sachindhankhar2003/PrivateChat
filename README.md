# 🔒 PrivateChat — Link-Based Private Chat Rooms

A full-stack real-time chat app where each room has a unique shareable link. Only people with the link can join and see messages.

## Features

- **Home page** — generate a unique private room link with one click
- **Copy-to-clipboard** — share the link instantly
- **Room isolation** — messages in room A are never seen in room B (Socket.io rooms)
- **Username modal** — enter your name when you first open a room link
- **Real-time messaging** — instant delivery via WebSockets
- **Typing indicators** — per-room, per-user
- **Online users list** — shows only users in the same room
- **Join/leave notifications** — scoped to the room
- **Leave Room button** — returns to home
- **Mobile-responsive** — slide-out sidebar on small screens

---

## Project Structure

```
chat-app/
├── server/
│   ├── server.js          # Express + Socket.io with room isolation
│   └── package.json
├── client/
│   ├── src/
│   │   ├── App.jsx         # React Router setup
│   │   ├── index.jsx       # Entry point
│   │   ├── index.css       # Tailwind + animations
│   │   └── pages/
│   │       ├── HomePage.jsx   # Room creation UI
│   │       └── RoomPage.jsx   # Chat interface
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   └── package.json
└── README.md
```

---

## Quick Start (Local)

### 1. Install dependencies

```bash
# Server
cd chat-app/server
npm install

# Client
cd ../client
npm install
```

### 2. Start the server

```bash
cd chat-app/server
npm start
# → http://localhost:3001
```

### 3. Start the client (new terminal)

```bash
cd chat-app/client
npm run dev
# → http://localhost:5173
```

Open `http://localhost:5173`, click **Create New Chat Room**, copy the link, and open it in another tab or browser to test multi-user chat.

---

## Environment Variables

### Server (`server/.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT`   | `3001`  | Server port |

### Client (`client/.env`)

| Variable          | Default                 | Description              |
|-------------------|-------------------------|--------------------------|
| `VITE_SERVER_URL` | `http://localhost:3001` | Socket.io server address |

---

## Deploying (so links work across devices)

### Option A — Railway (recommended, free tier)

1. Push this repo to GitHub.
2. [railway.app](https://railway.app) → New Project → Deploy from GitHub repo.
3. Add the **server** as a service:
   - Root directory: `chat-app/server`
   - Start command: `node server.js`
   - Railway auto-assigns a public URL, e.g. `https://chat-server.up.railway.app`
4. Add the **client** as a second service (or use Vercel/Netlify):
   - Root directory: `chat-app/client`
   - Build command: `npm install && npm run build`
   - Output directory: `dist`
   - Set env var: `VITE_SERVER_URL=https://chat-server.up.railway.app`

### Option B — Render

1. **Web Service** for server:
   - Root: `chat-app/server`
   - Build: `npm install`
   - Start: `node server.js`
2. **Static Site** for client:
   - Root: `chat-app/client`
   - Build: `npm install && npm run build`
   - Publish: `dist`
   - Env: `VITE_SERVER_URL=https://<your-render-server>.onrender.com`
3. Add a `_redirects` file in `client/public/` for SPA routing:
   ```
   /*  /index.html  200
   ```

### Option C — Nginx + VPS

```nginx
# Serve the built client
server {
  listen 80;
  server_name yourchat.com;
  root /var/www/chat-client/dist;
  index index.html;

  # SPA fallback — all routes serve index.html
  location / {
    try_files $uri $uri/ /index.html;
  }

  # Proxy WebSocket + API to Node server
  location /socket.io/ {
    proxy_pass http://localhost:3001;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
  }

  location /api/ {
    proxy_pass http://localhost:3001;
  }
}
```

---

## Socket.io Events Reference

| Event           | Direction       | Payload                                        |
|-----------------|-----------------|------------------------------------------------|
| `room:join`     | client → server | `{ roomId, username }`                         |
| `room:joined`   | server → client | `{ roomId, username }`                         |
| `room:leave`    | client → server | —                                              |
| `room:users`    | server → room   | `string[]` (usernames in this room)            |
| `message:send`  | client → server | `text: string`                                 |
| `message:receive` | server → room | `{ id, username, socketId, text, timestamp }`  |
| `message:system`  | server → room | `{ id, text, type, timestamp }`                |
| `typing:start`  | client → server | —                                              |
| `typing:stop`   | client → server | —                                              |
| `typing:update` | server → room   | `string[]` (typing usernames in this room)     |

---

## Tech Stack

| Layer    | Technology                        |
|----------|-----------------------------------|
| Server   | Node.js, Express, Socket.io 4     |
| Client   | React 18, React Router 6, Vite    |
| Styling  | Tailwind CSS 3                    |
| Protocol | WebSocket (polling fallback)      |
| Room IDs | `crypto.randomBytes(5).hex()`     |

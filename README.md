# 🔒 PrivateChat

A real-time private chat app where you create a unique room link and share it — only people with the link can join and chat.

## Features

- Generate a unique private room link with one click
- Real-time messaging with WebSockets
- Typing indicators & online users list
- Join/leave notifications
- Colorful animated UI with glass morphism
- Mobile responsive

## Tech Stack

- **Backend** — Node.js, Express, Socket.io
- **Frontend** — React, Vite, Tailwind CSS, React Router

## Getting Started (Local)

```bash
# Install & run server
cd server
npm install
npm start

# Install & run client (new terminal)
cd client
npm install
npm run dev
```

Open `http://localhost:5173`, create a room, share the link, and start chatting.

---

## 🚀 Deploy (Free)

### Step 1 — Deploy the Server on Railway

1. Go to [railway.app](https://railway.app) and sign in with GitHub
2. Click **New Project → Deploy from GitHub repo**
3. Select `PrivateChat` → set **Root Directory** to `server`
4. Railway auto-detects Node.js and runs `npm start`
5. Click **Generate Domain** — copy the URL (e.g. `https://privatechat-server.up.railway.app`)

### Step 2 — Deploy the Client on Vercel

1. Go to [vercel.com](https://vercel.com) and sign in with GitHub
2. Click **Add New Project → Import** `PrivateChat`
3. Set **Root Directory** to `client`
4. Under **Environment Variables** add:
   ```
   VITE_SERVER_URL = https://privatechat-server.up.railway.app
   ```
   (use your Railway URL from Step 1)
5. Click **Deploy**
6. Vercel gives you a live URL like `https://privatechat.vercel.app` ✅

### Done!
Share your Vercel URL with anyone — they open it, enter a name, and chat privately.

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

// ── Avatar palette — vivid gradient pairs ─────────────────────────────────────
const AVATAR_GRADIENTS = [
  'from-violet-500 to-purple-600',
  'from-pink-500 to-rose-500',
  'from-cyan-500 to-blue-500',
  'from-emerald-400 to-teal-500',
  'from-amber-400 to-orange-500',
  'from-fuchsia-500 to-pink-600',
  'from-indigo-500 to-violet-600',
  'from-lime-400 to-emerald-500',
];

// Bubble color pairs [own, other]
const BUBBLE_COLORS_OWN = [
  'from-violet-600 to-purple-600',
  'from-pink-600 to-rose-600',
  'from-cyan-600 to-blue-600',
  'from-emerald-500 to-teal-600',
  'from-amber-500 to-orange-500',
  'from-fuchsia-600 to-pink-600',
];

function avatarGradient(name = '') {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_GRADIENTS[Math.abs(h) % AVATAR_GRADIENTS.length];
}
function bubbleGradient(name = '') {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return BUBBLE_COLORS_OWN[Math.abs(h) % BUBBLE_COLORS_OWN.length];
}
function initials(name = '') { return name.slice(0, 2).toUpperCase(); }
function formatTime(iso) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// ── Typing dots ───────────────────────────────────────────────────────────────
function TypingDots() {
  return (
    <span className="inline-flex items-center gap-1">
      {[0,1,2].map(i => (
        <span key={i} className="typing-dot w-1.5 h-1.5 rounded-full inline-block"
          style={{ background: 'linear-gradient(135deg,#a78bfa,#f472b6)' }} />
      ))}
    </span>
  );
}

function TypingIndicator({ typingUsers, currentUser }) {
  const others = typingUsers.filter(u => u !== currentUser);
  if (!others.length) return <div className="h-7" />;
  const text = others.length === 1
    ? `${others[0]} is typing`
    : others.length === 2
    ? `${others[0]} and ${others[1]} are typing`
    : `${others.length} people are typing`;
  return (
    <div className="flex items-center gap-2 px-4 py-1 h-7">
      <TypingDots />
      <span className="text-xs text-white/40 italic">{text}</span>
    </div>
  );
}

// ── Message bubble ────────────────────────────────────────────────────────────
function MessageBubble({ msg, isOwn }) {
  if (msg.type === 'join' || msg.type === 'leave') {
    return (
      <div className="message-enter flex justify-center my-3">
        <span className={`text-xs px-4 py-1.5 rounded-full font-semibold flex items-center gap-1.5 ${
          msg.type === 'join'
            ? 'bg-emerald-500/15 border border-emerald-500/25 text-emerald-400'
            : 'bg-white/5 border border-white/10 text-white/40'
        }`}>
          {msg.type === 'join' ? '👋' : '👋'} {msg.text}
        </span>
      </div>
    );
  }

  return (
    <div className={`message-enter flex gap-2.5 mb-4 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar */}
      <div className={`flex-shrink-0 w-9 h-9 rounded-xl bg-gradient-to-br ${avatarGradient(msg.username)} flex items-center justify-center text-xs font-bold text-white shadow-lg ${isOwn ? 'avatar-pulse' : ''}`}>
        {initials(msg.username)}
      </div>

      {/* Content */}
      <div className={`flex flex-col max-w-[72%] ${isOwn ? 'items-end' : 'items-start'}`}>
        {!isOwn && (
          <span className="text-xs font-semibold mb-1 ml-1"
            style={{ background: `linear-gradient(90deg, #a78bfa, #f472b6)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            {msg.username}
          </span>
        )}
        <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed break-words shadow-lg ${
          isOwn
            ? `bg-gradient-to-br ${bubbleGradient(msg.username)} text-white rounded-tr-sm`
            : 'glass text-white/90 rounded-tl-sm'
        }`}>
          {msg.text}
        </div>
        <span className="text-xs text-white/25 mt-1 mx-1">{formatTime(msg.timestamp)}</span>
      </div>
    </div>
  );
}

// ── Users sidebar ─────────────────────────────────────────────────────────────
function UsersSidebar({ users, currentUser, isOpen, onClose }) {
  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-10 md:hidden" onClick={onClose} />
      )}
      <aside className={`
        fixed md:relative top-0 right-0 h-full z-20
        w-60 glass-dark border-l border-white/5
        flex flex-col transition-transform duration-300
        ${isOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}
      `}>
        {/* Header */}
        <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-white/60 uppercase tracking-widest">In Room</p>
            <p className="text-lg font-extrabold text-rainbow leading-tight">{users.length}</p>
          </div>
          <button onClick={onClose} className="md:hidden text-white/40 hover:text-white text-lg" aria-label="Close">✕</button>
        </div>

        {/* User list */}
        <ul className="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-1.5">
          {users.map((username) => (
            <li key={username}
              className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl hover:bg-white/5 transition-colors group">
              <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${avatarGradient(username)} flex items-center justify-center text-xs font-bold text-white flex-shrink-0 shadow-md`}>
                {initials(username)}
              </div>
              <span className={`text-sm truncate flex-1 ${username === currentUser ? 'font-bold' : 'text-white/70'}`}
                style={username === currentUser ? {
                  background: 'linear-gradient(90deg,#a78bfa,#f472b6)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent'
                } : {}}>
                {username}
                {username === currentUser && <span className="text-white/30 ml-1 text-xs" style={{ WebkitTextFillColor: 'rgba(255,255,255,0.3)' }}>(you)</span>}
              </span>
              <span className="online-dot w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0 shadow-[0_0_6px_#34d399]" />
            </li>
          ))}
        </ul>

        {/* Footer hint */}
        <div className="px-4 py-3 border-t border-white/5">
          <p className="text-xs text-white/20 text-center">🔒 Private room</p>
        </div>
      </aside>
    </>
  );
}

// ── Username modal ────────────────────────────────────────────────────────────
function UsernameModal({ roomId, onJoin, connecting, error }) {
  const [name, setName] = useState('');
  const inputRef = useRef(null);
  useEffect(() => { inputRef.current?.focus(); }, []);

  function handleSubmit(e) {
    e.preventDefault();
    const t = name.trim();
    if (t.length < 2) return;
    onJoin(t);
  }

  return (
    <div className="fixed inset-0 bg-[#0d0d1a]/80 backdrop-blur-xl flex items-center justify-center z-50 p-4">
      {/* Orbs behind modal */}
      <div className="orb orb-1" style={{ opacity: 0.15 }} />
      <div className="orb orb-2" style={{ opacity: 0.15 }} />

      <div className="glass rounded-3xl p-8 w-full max-w-sm shadow-2xl fade-scale relative z-10">
        {/* Icon */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 btn-neon rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4 shadow-2xl">
            🔒
          </div>
          <h1 className="text-2xl font-extrabold text-white mb-1">Join Private Room</h1>
          <p className="text-white/40 text-sm font-mono">#{roomId}</p>
        </div>

        {error && (
          <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm rounded-2xl px-4 py-3 mb-4 flex gap-2 items-start">
            <span>⚠️</span><span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="uname" className="block text-sm font-semibold text-white/60 mb-2">
              Your display name
            </label>
            <input
              id="uname"
              ref={inputRef}
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Alice 🦄"
              maxLength={30}
              disabled={connecting}
              className="input-glow w-full glass border border-white/10 text-white placeholder-white/25 rounded-2xl px-4 py-3 text-sm focus:outline-none transition bg-transparent"
            />
          </div>
          <button
            type="submit"
            disabled={name.trim().length < 2 || connecting}
            className="btn-neon w-full text-white font-bold py-3.5 rounded-2xl text-sm disabled:opacity-40"
          >
            {connecting ? '⏳ Joining…' : 'Join Room →'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Room Page ─────────────────────────────────────────────────────────────────
export default function RoomPage() {
  const { roomId } = useParams();
  const navigate = useNavigate();

  const [socket, setSocket] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [roomUsers, setRoomUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const [inputText, setInputText] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const typingTimerRef = useRef(null);
  const isTypingRef = useRef(false);
  const socketRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingUsers]);

  useEffect(() => {
    return () => {
      socketRef.current?.emit('room:leave');
      socketRef.current?.disconnect();
    };
  }, []);

  const handleJoin = useCallback((username) => {
    setConnecting(true);
    setConnectionError(null);

    const s = io(SERVER_URL, { transports: ['websocket', 'polling'], reconnectionAttempts: 5 });
    socketRef.current = s;

    s.on('connect', () => s.emit('room:join', { roomId, username }));

    s.on('room:joined', ({ username: confirmed }) => {
      setCurrentUser(confirmed);
      setConnecting(false);
      setSocket(s);
      setTimeout(() => inputRef.current?.focus(), 100);
    });

    s.on('message:receive', msg => setMessages(p => [...p, msg]));
    s.on('message:system',  msg => setMessages(p => [...p, msg]));
    s.on('room:users',   users => setRoomUsers(users));
    s.on('typing:update', users => setTypingUsers(users));

    s.on('connect_error', () => {
      setConnecting(false);
      setConnectionError('Could not connect to server. Is it running?');
      s.disconnect();
    });
    s.on('disconnect', () => setConnectionError('Disconnected. Refresh to reconnect.'));
  }, [roomId]);

  const handleSend = useCallback(() => {
    const text = inputText.trim();
    if (!text || !socketRef.current) return;
    socketRef.current.emit('message:send', text);
    setInputText('');
    if (isTypingRef.current) {
      socketRef.current.emit('typing:stop');
      isTypingRef.current = false;
    }
    clearTimeout(typingTimerRef.current);
  }, [inputText]);

  const handleInputChange = useCallback((e) => {
    setInputText(e.target.value);
    if (!socketRef.current) return;
    if (!isTypingRef.current) {
      socketRef.current.emit('typing:start');
      isTypingRef.current = true;
    }
    clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      socketRef.current?.emit('typing:stop');
      isTypingRef.current = false;
    }, 2000);
  }, []);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }, [handleSend]);

  function handleLeave() {
    socketRef.current?.emit('room:leave');
    socketRef.current?.disconnect();
    navigate('/');
  }

  async function handleCopyLink() {
    const link = window.location.href;
    try { await navigator.clipboard.writeText(link); }
    catch {
      const el = document.createElement('textarea');
      el.value = link; document.body.appendChild(el); el.select();
      document.execCommand('copy'); document.body.removeChild(el);
    }
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2500);
  }

  return (
    <div className="h-screen flex flex-col bg-mesh text-white overflow-hidden relative">
      {/* Background orbs */}
      <div className="orb orb-1" style={{ opacity: 0.12 }} />
      <div className="orb orb-2" style={{ opacity: 0.10 }} />

      {/* Username modal */}
      {!currentUser && (
        <UsernameModal roomId={roomId} onJoin={handleJoin} connecting={connecting} error={connectionError} />
      )}

      {/* Error banner */}
      {connectionError && currentUser && (
        <div className="relative z-10 bg-rose-500/10 border-b border-rose-500/20 text-rose-300 text-sm text-center py-2 px-4 flex-shrink-0">
          ⚠️ {connectionError}
        </div>
      )}

      {/* ── Header ── */}
      <header className="relative z-10 flex items-center justify-between px-4 py-3 glass-dark border-b border-white/5 flex-shrink-0 gap-2">
        {/* Left */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 btn-neon rounded-xl flex items-center justify-center text-lg flex-shrink-0">🔒</div>
          <div className="min-w-0">
            <h1 className="font-extrabold text-sm text-white leading-tight">Private Room</h1>
            <p className="text-xs text-white/30 font-mono truncate">#{roomId}</p>
          </div>
        </div>

        {/* Right */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Current user badge */}
          {currentUser && (
            <div className="hidden sm:flex items-center gap-1.5 glass rounded-full px-3 py-1.5">
              <div className={`w-4 h-4 rounded-full bg-gradient-to-br ${avatarGradient(currentUser)} flex-shrink-0`} />
              <span className="text-xs text-white/70 font-medium">{currentUser}</span>
            </div>
          )}

          {/* Share */}
          <button
            onClick={handleCopyLink}
            className={`text-xs px-3 py-1.5 rounded-full font-semibold transition-all flex items-center gap-1.5 ${
              linkCopied
                ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-300'
                : 'glass text-white/60 hover:text-white'
            }`}
          >
            {linkCopied ? '✅ Copied' : '🔗 Share'}
          </button>

          {/* Users (mobile) */}
          <button
            onClick={() => setSidebarOpen(o => !o)}
            className="md:hidden glass text-white/60 hover:text-white text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5 transition-colors"
          >
            <span>👥</span><span className="font-bold">{roomUsers.length}</span>
          </button>

          {/* Leave */}
          <button
            onClick={handleLeave}
            className="bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/20 text-rose-400 text-xs px-3 py-1.5 rounded-full transition-all font-semibold"
          >
            Leave
          </button>
        </div>
      </header>

      {/* ── Body ── */}
      <div className="flex flex-1 overflow-hidden relative z-10">
        {/* Messages */}
        <main className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto scrollbar-thin px-4 py-4">
            {messages.length === 0 && currentUser && (
              <div className="flex flex-col items-center justify-center h-full text-center gap-4 fade-scale">
                <div className="w-16 h-16 glass rounded-2xl flex items-center justify-center text-3xl">🔒</div>
                <div>
                  <p className="text-white/60 font-semibold text-sm">This room is private</p>
                  <p className="text-white/25 text-xs mt-1 max-w-xs">
                    Messages are only visible to people who have this room's link.
                  </p>
                </div>
                <div className="flex gap-2 text-xs text-white/20">
                  <span className="glass px-3 py-1 rounded-full">🔗 Share the link</span>
                  <span className="glass px-3 py-1 rounded-full">💬 Start chatting</span>
                </div>
              </div>
            )}

            {messages.map(msg => (
              <MessageBubble key={msg.id} msg={msg} isOwn={msg.socketId === socket?.id} />
            ))}
            <div ref={messagesEndRef} />
          </div>

          <TypingIndicator typingUsers={typingUsers} currentUser={currentUser} />

          {/* ── Input bar ── */}
          <div className="px-4 py-3 glass-dark border-t border-white/5 flex-shrink-0">
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={inputText}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder={currentUser ? 'Type a message… (Enter to send)' : 'Join to chat'}
                disabled={!currentUser || !socket}
                rows={1}
                maxLength={1000}
                className="input-glow flex-1 glass border border-white/10 text-white placeholder-white/25 rounded-2xl px-4 py-3 text-sm resize-none focus:outline-none transition disabled:opacity-40 disabled:cursor-not-allowed leading-relaxed bg-transparent"
                style={{ maxHeight: '120px', overflowY: 'auto' }}
              />
              <button
                onClick={handleSend}
                disabled={!inputText.trim() || !socket}
                className="btn-neon flex-shrink-0 text-white rounded-2xl px-5 py-3 font-bold text-sm disabled:opacity-30"
              >
                Send
              </button>
            </div>
            <p className="text-xs text-white/15 mt-1.5 ml-1">
              Shift+Enter for new line · {inputText.length}/1000
            </p>
          </div>
        </main>

        {/* Sidebar */}
        <UsersSidebar
          users={roomUsers}
          currentUser={currentUser}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
      </div>
    </div>
  );
}

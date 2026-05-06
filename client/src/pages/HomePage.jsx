import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

// ── Confetti burst ────────────────────────────────────────────────────────────
const CONFETTI_COLORS = ['#a78bfa','#f472b6','#38bdf8','#34d399','#fbbf24','#fb923c','#e879f9'];
function spawnConfetti() {
  const count = 60;
  for (let i = 0; i < count; i++) {
    const el = document.createElement('div');
    el.className = 'confetti-piece';
    el.style.left = `${Math.random() * 100}vw`;
    el.style.top = '0px';
    el.style.background = CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)];
    el.style.width = `${6 + Math.random() * 8}px`;
    el.style.height = `${6 + Math.random() * 8}px`;
    el.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
    el.style.animationDuration = `${1.5 + Math.random() * 2}s`;
    el.style.animationDelay = `${Math.random() * 0.5}s`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 3500);
  }
}

// ── Floating particles background ────────────────────────────────────────────
function Particles() {
  const particles = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    size: 2 + Math.random() * 4,
    x: Math.random() * 100,
    y: Math.random() * 100,
    dur: 8 + Math.random() * 12,
    delay: Math.random() * 8,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
  }));

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full opacity-30"
          style={{
            width: p.size,
            height: p.size,
            left: `${p.x}%`,
            top: `${p.y}%`,
            background: p.color,
            animation: `orb-float ${p.dur}s ease-in-out ${p.delay}s infinite`,
            filter: 'blur(1px)',
          }}
        />
      ))}
    </div>
  );
}

export default function HomePage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [createdLink, setCreatedLink] = useState(null);
  const [copied, setCopied] = useState(false);
  const cardRef = useRef(null);

  async function handleCreate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${SERVER_URL}/api/create-room`);
      if (!res.ok) throw new Error('Server error');
      const { roomId } = await res.json();
      const link = `${window.location.origin}/room/${roomId}`;
      setCreatedLink({ roomId, link });
      spawnConfetti();
    } catch {
      setError('Could not reach the server. Make sure it\'s running on port 3001.');
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    if (!createdLink) return;
    try {
      await navigator.clipboard.writeText(createdLink.link);
    } catch {
      const el = document.createElement('textarea');
      el.value = createdLink.link;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  const steps = [
    { icon: '✨', color: 'from-violet-500 to-purple-600', title: 'Generate a link', desc: 'One click creates a unique private room URL.' },
    { icon: '📤', color: 'from-pink-500 to-rose-500',    title: 'Share it',         desc: 'Send the link to anyone you want to chat with.' },
    { icon: '💬', color: 'from-cyan-500 to-blue-500',    title: 'Chat privately',   desc: 'Only people with the link can see messages.' },
  ];

  return (
    <div className="min-h-screen bg-mesh flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background layers */}
      <div className="orb orb-1" />
      <div className="orb orb-2" />
      <div className="orb orb-3" />
      <Particles />

      {/* Content */}
      <div className="relative z-10 w-full max-w-lg flex flex-col items-center">

        {/* Hero */}
        <div className="text-center mb-8 fade-scale">
          {/* Animated logo */}
          <div className="relative inline-block mb-4">
            <div className="w-20 h-20 rounded-2xl btn-neon flex items-center justify-center text-4xl shadow-2xl mx-auto">
              🔒
            </div>
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-400 rounded-full border-2 border-[#0d0d1a] online-dot" />
          </div>
          <h1 className="text-5xl font-extrabold text-rainbow mb-3">PrivateChat</h1>
          <p className="text-white/50 text-base max-w-sm mx-auto leading-relaxed">
            Create a private room, share the link —<br />
            <span className="text-white/70 font-medium">only people with the link can join.</span>
          </p>
        </div>

        {/* Main card */}
        <div ref={cardRef} className="glass rounded-3xl p-8 w-full shadow-2xl fade-scale" style={{ animationDelay: '0.1s' }}>
          {!createdLink ? (
            <>
              <h2 className="text-white font-bold text-xl mb-1">Start a private chat</h2>
              <p className="text-white/40 text-sm mb-6">
                A unique encrypted room link will be generated instantly.
              </p>

              {error && (
                <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm rounded-2xl px-4 py-3 mb-5 flex items-start gap-2">
                  <span className="text-lg leading-none mt-0.5">⚠️</span>
                  <span>{error}</span>
                </div>
              )}

              <button
                onClick={handleCreate}
                disabled={loading}
                className="btn-neon w-full text-white font-bold py-4 rounded-2xl text-base flex items-center justify-center gap-2.5 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Spinner />
                    <span>Generating room…</span>
                  </>
                ) : (
                  <>
                    <span className="text-xl">✨</span>
                    <span>Create New Chat Room</span>
                  </>
                )}
              </button>
            </>
          ) : (
            <div className="fade-scale">
              {/* Success header */}
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-xl">
                  🎉
                </div>
                <div>
                  <h2 className="text-white font-bold text-lg leading-tight">Room created!</h2>
                  <p className="text-white/40 text-xs">Share the link below to invite people</p>
                </div>
              </div>

              {/* Link box with shimmer border */}
              <div className="relative mb-4 rounded-2xl p-px shimmer-border">
                <div className="bg-[#0d0d1a] rounded-2xl px-4 py-3 flex items-center gap-2">
                  <span className="text-sm">🔗</span>
                  <span className="text-violet-300 text-sm font-mono truncate flex-1 select-all">
                    {createdLink.link}
                  </span>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2.5 mb-5">
                <button
                  onClick={handleCopy}
                  className={`flex-1 py-3 rounded-2xl text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                    copied
                      ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300'
                      : 'glass text-white/80 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {copied ? '✅ Copied!' : '📋 Copy Link'}
                </button>
                <button
                  onClick={() => navigate(`/room/${createdLink.roomId}`)}
                  className="btn-neon flex-1 text-white py-3 rounded-2xl text-sm font-bold flex items-center justify-center gap-2"
                >
                  <span>Enter Room</span>
                  <span>→</span>
                </button>
              </div>

              <button
                onClick={() => { setCreatedLink(null); setCopied(false); }}
                className="w-full text-white/30 hover:text-white/60 text-sm transition-colors"
              >
                ↩ Create a different room
              </button>
            </div>
          )}
        </div>

        {/* How it works */}
        <div className="mt-8 grid grid-cols-3 gap-3 w-full fade-scale" style={{ animationDelay: '0.2s' }}>
          {steps.map((step, i) => (
            <div
              key={step.title}
              className="step-card glass rounded-2xl p-4 text-center cursor-default"
            >
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${step.color} flex items-center justify-center text-lg mx-auto mb-3 shadow-lg`}>
                {step.icon}
              </div>
              <h3 className="text-white text-xs font-bold mb-1">{step.title}</h3>
              <p className="text-white/35 text-xs leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>

        <p className="mt-6 text-white/20 text-xs fade-scale" style={{ animationDelay: '0.3s' }}>
          No account needed · End-to-end isolated rooms · Free forever
        </p>
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  );
}

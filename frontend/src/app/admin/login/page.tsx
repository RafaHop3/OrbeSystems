'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Terminal, ShieldAlert } from 'lucide-react';

export default function AdminLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const trimmedPassword = password.trim();
    console.log('[FRONTEND] Sending login:', { username, password: trimmedPassword, passwordLength: trimmedPassword.length });

    try {
      const rawUrl = process.env.NEXT_PUBLIC_API_URL ?? 'https://orbe-systems-fuc5.vercel.app';
      const API_URL = rawUrl.trim().replace(/\/$/, '');

      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password: trimmedPassword }),
      });

      if (!res.ok) {
        if (res.status === 401) {
          throw new Error('ACCESS DENIED. INVALID CREDENTIALS.');
        }
        if (res.status === 429) {
          throw new Error('TOO MANY ATTEMPTS. SYSTEM LOCKED TEMPORARILY.');
        }
        throw new Error(`SERVER ERROR [${res.status}]: Connection established but access rejected.`);
      }

      const data = await res.json();
      localStorage.setItem('orbe_admin_token', data.access_token);
      
      router.push('/admin');
    } catch (err: any) {
      const rawUrl = process.env.NEXT_PUBLIC_API_URL ?? 'https://orbe-systems-fuc5.vercel.app';
      const API_URL = rawUrl.trim().replace(/\/$/, '');
      
      // If it's a manual error we threw (like ACCESS DENIED), use that.
      // Otherwise, it's a real Network/CORS failure.
      if (err.message && !err.message.includes('fetch')) {
        setError(err.message);
      } else {
        setError(`NETWORK/CORS ERROR: LATEST BUILD (1561) UNREACHABLE AT ${API_URL}.`);
      }
      
      console.error("[LOGIN DEBUG]", { API_URL, origin: window.location.origin, err });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-black relative overflow-hidden">
      {/* Scanline effect */}
      <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.25)_50%)] bg-[length:100%_4px]" />
      
      <div className="w-full max-w-md border border-neon-green/30 bg-black p-8 relative z-10 shadow-[0_0_20px_rgba(57,255,20,0.1)]">
        <div className="flex flex-col items-center mb-8 gap-4">
          <Terminal className="text-neon-green w-12 h-12" />
          <div className="text-center">
            <h1 className="text-xl font-bold tracking-widest text-neon-green">
              ORBE SYSTEMS
            </h1>
            <p className="text-xs text-neon-green/60 mt-1 uppercase">
              Secure Gateway Prototype
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-3 border border-red-500/50 bg-red-500/10 flex items-center gap-3 text-red-500 text-xs uppercase animate-pulse">
            <ShieldAlert size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs uppercase text-neon-green/80 flex justify-between">
              <span>Username</span>
            </label>
            <input
              type="text"
              autoFocus
              className="w-full bg-transparent border-b border-neon-green/40 px-0 py-2 text-neon-green focus:outline-none focus:border-neon-green focus:shadow-[0_1px_10px_rgba(57,255,20,0.3)] transition-all placeholder:text-neon-green/20"
              placeholder="_"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs uppercase text-neon-green/80">
              Passphrase
            </label>
            <input
              type="password"
              className="w-full bg-transparent border-b border-neon-green/40 px-0 py-2 text-neon-green focus:outline-none focus:border-neon-green focus:shadow-[0_1px_10px_rgba(57,255,20,0.3)] transition-all placeholder:text-neon-green/20"
              placeholder="***"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-4 border border-neon-green text-neon-green py-3 text-sm uppercase tracking-widest hover:bg-neon-green hover:text-black transition-colors disabled:opacity-50 flex justify-center"
          >
            {loading ? 'Authenticating...' : 'Initialize Override'}
          </button>
        </form>

        <div className="mt-8 text-center text-[10px] text-neon-green/40 uppercase">
          Unauthorised access is strictly prohibited and will be logged.
        </div>
      </div>
    </div>
  );
}

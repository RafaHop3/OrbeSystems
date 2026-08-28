import React, { useState } from 'react';
import { Lock, ShieldAlert, CheckCircle2, ChevronRight } from 'lucide-react';

export default function ChangePasswordPanel() {
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [msg, setMsg] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            setStatus('error');
            setMsg('Passwords do not match.');
            return;
        }
        if (newPassword.length < 8) {
            setStatus('error');
            setMsg('New password must be at least 8 characters long.');
            return;
        }

        setStatus('loading');
        setMsg('');

        try {
            const token = localStorage.getItem('orbe_admin_token');
            const rawUrl = process.env.NEXT_PUBLIC_API_URL ?? 'https://orbe-systems-api.onrender.com';
            const API_URL = rawUrl.trim().replace(/\/$/, '');

            const res = await fetch(`${API_URL}/api/users/change-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    current_password: currentPassword,
                    new_password: newPassword
                })
            });

            if (!res.ok) {
                let errorMsg = 'Failed to update password.';
                try {
                    const data = await res.json();
                    errorMsg = data.detail || errorMsg;
                } catch (err) { }
                throw new Error(errorMsg);
            }

            const data = await res.json();
            // Update token with new one if provided
            if (data.access_token) {
                localStorage.setItem('orbe_admin_token', data.access_token);
            }

            setStatus('success');
            setMsg('Password updated successfully!');
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (e: any) {
            setStatus('error');
            setMsg(e.message || 'An unexpected error occurred.');
        }
    };

    return (
        <div className="border border-neon-cyan/20 bg-neon-cyan/5 p-5 animate-in fade-in duration-300">
            <h2 className="text-xs font-bold border-b border-neon-cyan/10 pb-3 mb-6 flex items-center justify-between text-neon-cyan uppercase tracking-[0.2em]">
                <div className="flex items-center gap-2">
                    <Lock size={14} /> SECURITY & ACCESS
                </div>
            </h2>

            <div className="max-w-md">
                <p className="text-[10px] text-neon-cyan/60 uppercase tracking-widest mb-6 border-l border-neon-cyan/30 pl-3">
                    Modify your master encryption key. This action requires your current passphrase to authenticate.
                </p>

                {status === 'success' && (
                    <div className="flex items-center gap-2 text-neon-green text-[10px] font-mono border border-neon-green/30 bg-neon-green/5 px-4 py-3 mb-6">
                        <CheckCircle2 size={14} /> {msg}
                    </div>
                )}

                {status === 'error' && (
                    <div className="flex items-center gap-2 text-red-400 text-[10px] font-mono border border-red-500/30 bg-red-500/5 px-4 py-3 mb-6 animate-pulse">
                        <ShieldAlert size={14} /> {msg}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="space-y-2">
                        <label className="text-[9px] uppercase tracking-widest text-neon-cyan/80">Current Passphrase</label>
                        <input
                            type="password"
                            className="w-full bg-black/60 border border-neon-cyan/30 px-3 py-2.5 text-xs text-neon-cyan focus:outline-none focus:border-neon-cyan focus:shadow-[0_0_10px_rgba(0,255,245,0.2)] transition-all placeholder:text-neon-cyan/20"
                            placeholder="••••••••"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            disabled={status === 'loading'}
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-[9px] uppercase tracking-widest text-neon-cyan/80">New Passphrase</label>
                        <input
                            type="password"
                            className="w-full bg-black/60 border border-neon-cyan/30 px-3 py-2.5 text-xs text-neon-cyan focus:outline-none focus:border-neon-cyan focus:shadow-[0_0_10px_rgba(0,255,245,0.2)] transition-all placeholder:text-neon-cyan/20"
                            placeholder="••••••••"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            disabled={status === 'loading'}
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-[9px] uppercase tracking-widest text-neon-cyan/80">Confirm New Passphrase</label>
                        <input
                            type="password"
                            className="w-full bg-black/60 border border-neon-cyan/30 px-3 py-2.5 text-xs text-neon-cyan focus:outline-none focus:border-neon-cyan focus:shadow-[0_0_10px_rgba(0,255,245,0.2)] transition-all placeholder:text-neon-cyan/20"
                            placeholder="••••••••"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            disabled={status === 'loading'}
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={status === 'loading'}
                        className="mt-6 flex items-center justify-center gap-2 border border-neon-cyan text-neon-cyan py-3 px-6 text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-neon-cyan hover:text-black transition-all disabled:opacity-50"
                    >
                        {status === 'loading' ? (
                            <span className="animate-spin inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full" />
                        ) : (
                            <>
                                <Lock size={12} />
                                UPDATE CREDENTIALS
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}

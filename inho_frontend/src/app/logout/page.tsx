'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';

export default function LogoutPage() {
    const router = useRouter();
    const { logout } = useAuth();

    useEffect(() => {
        const performLogout = async () => {
            try {
                await logout();
            } catch (err) {
                console.error('Logout error:', err);
            } finally {
                router.replace('/login');
            }
        };
        performLogout();
    }, [logout, router]);

    return (
        <div className="min-h-screen bg-inho-black flex items-center justify-center p-6 text-center">
            <div className="glassmorphism rounded-2xl p-8 max-w-sm border border-inho-gold/20">
                <p className="text-inho-text font-bold mb-2">Encerrando sessão...</p>
                <p className="text-inho-muted text-xs">Redirecionando para a página de login.</p>
            </div>
        </div>
    );
}

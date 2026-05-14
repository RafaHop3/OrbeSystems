import { useState, useEffect } from 'react';
import { getMeAction, logoutAction } from '@/lib/auth-actions';
import type { AuthUser } from '@/lib/auth';

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await getMeAction();
        if (res.user) {
          setUser(res.user);
        }
      } catch (error) {
        console.error('Auth check failed:', error);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const logout = async () => {
    try {
      await logoutAction();
      // logoutAction vai dar throw de REDIRECT internamente, 
      // mas se não der, limpamos o estado:
      setUser(null);
    } catch (error) {
      // O Next.js usa erros para redirecionar em Server Actions.
      // Se for um erro de redirect, não devemos engolir.
      if (error instanceof Error && error.message.includes('NEXT_REDIRECT')) {
        throw error;
      }
      console.error('Logout failed:', error);
    }
  };

  return { user, loading, logout };
}

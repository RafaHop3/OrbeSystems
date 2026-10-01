'use client';
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { TokenResponse } from '@/types/api';

interface UserState {
    fullName: string;
    email: string;
}

interface AuthContextType {
    user: UserState | null;
    login: (data: TokenResponse) => void;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<UserState | null>(null);

    useEffect(() => {
        // Hidratação do estado no client-side evitando erros de SSR no Next.js
        const token = localStorage.getItem('@inho:token');
        const storedName = localStorage.getItem('@inho:fullName');
        const storedEmail = localStorage.getItem('@inho:email');

        if (token && storedName && storedEmail) {
            setUser({ fullName: storedName, email: storedEmail });
        }
    }, []);

    const login = (data: TokenResponse) => {
        localStorage.setItem('@inho:token', data.access_token);
        localStorage.setItem('@inho:fullName', data.full_name);
        localStorage.setItem('@inho:email', data.email);
        setUser({ fullName: data.full_name, email: data.email });
    };

    const logout = () => {
        localStorage.removeItem('@inho:token');
        localStorage.removeItem('@inho:fullName');
        localStorage.removeItem('@inho:email');
        setUser(null);
        window.location.href = '/login';
    };

    return (
        <AuthContext.Provider value={{ user, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);

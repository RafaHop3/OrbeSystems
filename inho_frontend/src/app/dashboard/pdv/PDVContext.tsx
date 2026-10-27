'use client';

/**
 * INHO – PDV Context (Sessão Dupla)
 * 
 * Este Contexto gerencia a "Sessão Física" do caixa.
 * Ele opera em PARALELO ao AuthContext. Mesmo logado no sistema,
 * o usuário não pode acessar o PDV sem ter um "Caixa Aberto" vinculado
 * ao seu ID de operador naquele momento.
 */

import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { pdvApi } from '@/lib/api';
import type { CashRegisterOut, OpenRegisterRequest } from '@/types/pdv';

interface PDVContextValue {
    session: CashRegisterOut | null;
    isLoading: boolean;
    error: string | null;
    refreshSession: () => Promise<void>;
    openSession: (payload: OpenRegisterRequest) => Promise<void>;
    closeSession: () => Promise<void>;
}

const PDVContext = createContext<PDVContextValue | null>(null);

export function PDVProvider({ children }: { children: ReactNode }) {
    const [session, setSession] = useState<CashRegisterOut | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const refreshSession = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const activeSession = await pdvApi.getSession();
            setSession(activeSession);
        } catch (err: any) {
            if (err.message?.includes('nenhum caixa aberto') || err.message?.includes('404')) {
                setSession(null); // Legal state: No open register
            } else {
                setError(err.message || 'Erro ao carregar sessão do caixa.');
            }
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Fetch session on provider mount
    useEffect(() => {
        refreshSession();
    }, [refreshSession]);

    const openSession = useCallback(async (payload: OpenRegisterRequest) => {
        setIsLoading(true);
        try {
            const newSession = await pdvApi.openRegister(payload);
            setSession(newSession);
            setError(null);
        } catch (err: any) {
            setError(err.message || 'Erro ao abrir caixa.');
            throw err; // Re-throw so UI can handle (e.g. show toast)
        } finally {
            setIsLoading(false);
        }
    }, []);

    const closeSession = useCallback(async () => {
        if (!session) return;
        setIsLoading(true);
        try {
            await pdvApi.closeRegister(session.id);
            setSession(null);
            setError(null);
        } catch (err: any) {
            setError(err.message || 'Erro ao fechar caixa.');
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, [session]);

    return (
        <PDVContext.Provider value={{ session, isLoading, error, refreshSession, openSession, closeSession }}>
            {children}
        </PDVContext.Provider>
    );
}

export function usePDV() {
    const ctx = useContext(PDVContext);
    if (!ctx) {
        throw new Error('usePDV must be used within <PDVProvider>');
    }
    return ctx;
}

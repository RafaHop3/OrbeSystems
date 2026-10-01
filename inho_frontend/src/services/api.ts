import { apiFetch } from '@/lib/fetchClient';
import {
    TokenResponse,
    User,
    SendWhatsAppPayload,
    SendWhatsAppResponse
} from '@/types/api';

export const AuthService = {
    login: async (credentials: Record<string, string>) => {
        return apiFetch<TokenResponse>('/api/v1/auth/login', {
            method: 'POST',
            body: JSON.stringify(credentials),
        });
    }
};

export const UserService = {
    getUsers: async () => {
        return apiFetch<User[]>('/users', {
            method: 'GET',
        });
    }
};

export const WhatsAppService = {
    sendMessage: async (payload: SendWhatsAppPayload) => {
        return apiFetch<SendWhatsAppResponse>('/send', {
            method: 'POST',
            body: JSON.stringify(payload),
            useBotEngine: true, // Redireciona via proxy reverso seguro para o Node.js
        });
    }
};

export interface TokenResponse {
    access_token: string;
    token_type: string;
    full_name: string;
    email: string;
}

export interface User {
    id: string; // UUID v4 format
    email: string;
    full_name: string;
    is_active: boolean;
    role: 'SUPER_ADMIN' | 'ADMIN' | 'INHO_OPERATOR';
}

export interface SendWhatsAppPayload {
    phone: string;
    message: string;
}

export interface SendWhatsAppResponse {
    success: boolean;
    delivered: boolean;
    recipient: string;
}

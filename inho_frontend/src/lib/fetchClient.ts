const API_URL = process.env.NEXT_PUBLIC_GCP_API_URL || 'https://inho-api.orbesystems.com.br';
// Endpoint seguro passando pelo Cloudflare DNS (proxy Nginx) na E2 Micro
const BOT_URL = `https://baileys.orbesystems.com.br`;

interface FetchOptions extends RequestInit {
    useBotEngine?: boolean;
}

export async function apiFetch<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
    const { useBotEngine, ...fetchOptions } = options;
    const baseUrl = useBotEngine ? BOT_URL : API_URL;

    const headers = new Headers(fetchOptions.headers || {});
    headers.set('Content-Type', 'application/json');

    if (typeof window !== 'undefined') {
        const token = localStorage.getItem('@inho:token');
        if (token) {
            headers.set('Authorization', `Bearer ${token}`);
        }
    }

    const response = await fetch(`${baseUrl}${endpoint}`, {
        ...fetchOptions,
        headers,
    });

    if (!response.ok) {
        if (response.status === 401) {
            if (typeof window !== 'undefined') {
                localStorage.removeItem('@inho:token');
                localStorage.removeItem('@inho:fullName');
                localStorage.removeItem('@inho:email');
                window.location.href = '/login';
            }
        }
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Erro HTTP: ${response.status}`);
    }

    return response.json() as Promise<T>;
}

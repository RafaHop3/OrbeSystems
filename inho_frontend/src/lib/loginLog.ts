export interface LoginLogEntry {
    timestamp: string;
    payload: any;
    result?: any;
    error?: any;
}

const LOG_KEY = 'admin_login_logs';

export function addLoginLog(entry: LoginLogEntry) {
    const existing = JSON.parse(localStorage.getItem(LOG_KEY) || '[]') as LoginLogEntry[];
    existing.unshift(entry); // newest first
    // keep only recent 100 entries
    const trimmed = existing.slice(0, 100);
    localStorage.setItem(LOG_KEY, JSON.stringify(trimmed));
}

export function getLoginLogs(): LoginLogEntry[] {
    return JSON.parse(localStorage.getItem(LOG_KEY) || '[]') as LoginLogEntry[];
}

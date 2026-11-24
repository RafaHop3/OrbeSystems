/**
 * INHO – API Client (Secure Edition)
 *
 * Interceptor pattern:
 *  1. Inject Authorization header from in-memory token.
 *  2. On 401 → attempt silent refresh via HttpOnly cookie.
 *  3. If refresh succeeds → retry original request once.
 *  4. If refresh fails → clear token → redirect to /login.
 *
 * The refresh token is NEVER touched in JS — it rides the HttpOnly
 * cookie automatically via credentials:'include'.
 */

import { auth } from './auth';
import type { ContractOut, ContractCreate, ContractStatus } from '../types/contracts';
import type { OpenRegisterRequest, CashRegisterOut, PDVSaleCreate, PDVSaleOut } from '../types/pdv';

function getBaseUrl(): string {
  let url = process.env.NEXT_PUBLIC_API_URL || 'https://inho-api.orbesystems.com.br';
  return url.replace('http://', 'https://');
}

const BASE_URL = getBaseUrl();
export const API_BASE_URL = BASE_URL;

// ── Types ──────────────────────────────────────────────────────────
export interface TokenResponse {
  access_token: string;
  refresh_token?: string; // backend may or may not echo this
  token_type: string;
}

export interface UserMe {
  id: string;
  email: string;
  full_name: string;
  role: string;
  role_label?: string;
  is_active: boolean;
  is_verified: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface RegisterPayload {
  full_name: string;
  email: string;
  password: string;
}

export interface LoginPayload {
  email: string;
  password: string;
  mfa_code?: string;
}

export interface ApiError {
  detail: string;
}

// ── Silent Refresh (called internally on 401) ──────────────────────
let _refreshPromise: Promise<boolean> | null = null;

async function silentRefresh(): Promise<boolean> {
  // Deduplicate: if multiple requests 401 at the same time, only one refresh fires
  if (_refreshPromise) return _refreshPromise;

  _refreshPromise = (async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/v1/auth/refresh`, {
        method: 'POST',
        credentials: 'include', // sends HttpOnly refresh cookie
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) return false;
      const data: TokenResponse = await res.json();
      auth.setAccessToken(data.access_token);
      return true;
    } catch {
      return false;
    } finally {
      _refreshPromise = null;
    }
  })();

  return _refreshPromise;
}

// ── Core Fetch Interceptor ─────────────────────────────────────────
export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  _retry = false
): Promise<T> {
  const token = auth.getAccessToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (typeof FormData !== 'undefined' && options.body instanceof FormData) {
    delete headers['Content-Type'];
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
    credentials: 'include', // always send cookies (refresh token)
  });

  // ── 401 Interception ────────────────────────────────────────────
  const isAuthRoute = path.includes('/auth/login') || path.includes('/auth/refresh');

  if (res.status === 401 && !_retry && !isAuthRoute) {
    const refreshed = await silentRefresh();
    if (refreshed) {
      // Retry the original request with the new token
      return apiFetch<T>(path, options, true);
    }
    // Refresh failed — session is dead, send to login
    auth.clearAccessToken();
    // Issue a silent logout to the backend to kill the HttpOnly cookie and prevent ghost-session loops
    fetch(`${BASE_URL}/api/v1/auth/logout`, { method: 'POST', credentials: 'include' }).catch(() => { });

    if (typeof window !== 'undefined') {
      window.location.replace('/login');
    }
    throw new Error('Sessão expirada. Redirecionando para o login.');
  }

  // ── 204 No Content ──────────────────────────────────────────────
  if (res.status === 204) return {} as T;

  // ── Blind JSON parse: server may return HTML on 502/504 ─────────
  let data: any;
  try {
    data = await res.json();
  } catch {
    data = { detail: 'Erro na comunicação com o servidor. A resposta não pôde ser lida.' };
  }

  if (!res.ok) {
    const detail = data?.detail;
    const msg = Array.isArray(detail)
      ? detail.map((d: any) => d?.msg || JSON.stringify(d)).join('; ')
      : typeof detail === 'string'
        ? detail
        : detail
          ? JSON.stringify(detail)
          : 'Erro desconhecido na rede';
    throw new Error(msg);
  }

  return data as T;
}

// ── Auth endpoints ─────────────────────────────────────────────────
export const authApi = {
  login: async (payload: LoginPayload) => {
    const cleanPayload: LoginPayload = {
      ...payload,
      email: payload.email.trim().toLowerCase(),
      password: payload.password.trim(),
    };
    return apiFetch<TokenResponse>('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify(cleanPayload),
    });
  },

  me: () => apiFetch<UserMe>('/api/v1/users/me'),

  /** Fires automatically by the interceptor — not called manually */
  refresh: () =>
    apiFetch<TokenResponse>('/api/v1/auth/refresh', { method: 'POST' }),

  /** Clears the HttpOnly refresh cookie server-side */
  logout: () =>
    apiFetch<void>('/api/v1/auth/logout', { method: 'POST' }),

  changePassword: (current_password: string, new_password: string) =>
    apiFetch<{ status: string; message: string }>('/api/v1/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ current_password, new_password }),
    }),

  enrollConfirmMfa: (mfa_enrollment_token: string, code: string) =>
    apiFetch<TokenResponse & { requires_password_change?: boolean }>('/api/v1/auth/mfa/enroll-confirm', {
      method: 'POST',
      body: JSON.stringify({ mfa_enrollment_token, code: code.trim() }),
    }),
};

// ── Users endpoints ────────────────────────────────────────────────
export interface UserCreatePayload {
  email: string;
  full_name: string;
  password: string;
  role: 'super_admin' | 'admin' | 'operator' | 'viewer' | 'client';
  is_active?: boolean;
  business_id?: string;
}

export interface UserUpdatePayload {
  full_name?: string;
  password?: string;
  role?: 'super_admin' | 'admin' | 'operator' | 'viewer' | 'client';
  is_active?: boolean;
}

export const usersApi = {
  me: () => apiFetch<UserMe>('/api/v1/users/me'),
  list: () => apiFetch<UserMe[]>('/api/v1/users/'),
  create: (payload: UserCreatePayload) =>
    apiFetch<UserMe>('/api/v1/users/', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  update: (id: string, payload: UserUpdatePayload) =>
    apiFetch<UserMe>(`/api/v1/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  delete: (id: string) =>
    apiFetch<void>(`/api/v1/users/${id}`, {
      method: 'DELETE',
    }),
};

// ── Audit endpoints ────────────────────────────────────────────────
export const auditApi = {
  listMyLogs: () => apiFetch<any[]>('/api/v1/audit/me'),
  listAllLogs: () => apiFetch<any[]>('/api/v1/audit/all'),
};

// ── Businesses (Tenants) ─────────────────────────────────────────
export interface BusinessCreate {
  name: string;
  cnpj?: string;
  category: 'COOPERATIVA' | 'VAREJO' | 'SERVICOS' | 'OUTROS';
}

export interface BusinessOut {
  id: string;
  name: string;
  cnpj?: string;
  category: string;
  plan_tier?: string;
  billing_cycle?: string;
  monthly_price_cents?: number;
  max_operators?: number;
  operators_count?: number;
  ai_rag_enabled?: boolean;
  cbm_predictive_enabled?: boolean;
  cooperativa_module_enabled?: boolean;
  monthly_ai_quota?: number;
  rag_chunks_count?: number;
}

export const businessesApi = {
  list: () => apiFetch<BusinessOut[]>('/api/v1/businesses/'),
  create: (payload: BusinessCreate) =>
    apiFetch<BusinessOut>('/api/v1/businesses/', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};

// ── Contracts ─────────────────────────────────────────────────────

export const contractsApi = {
  list: () => apiFetch<ContractOut[]>('/api/v1/contracts/'),
  create: (payload: ContractCreate) =>
    apiFetch<ContractOut>('/api/v1/contracts/', { method: 'POST', body: JSON.stringify(payload) }),
  activate: (id: string) =>
    apiFetch<ContractOut>(`/api/v1/contracts/${id}/activate`, { method: 'POST' }),
  updateStatus: (id: string, new_status: ContractStatus) =>
    apiFetch<ContractOut>(`/api/v1/contracts/${id}/status?new_status=${new_status}`, { method: 'PATCH' }),
  generateSchedule: (id: string, idempotencyKey?: string) => {
    const key = idempotencyKey || `sched-${id}-${Math.floor(Date.now() / 60000)}`;
    return apiFetch<{
      contract_id: string;
      record_type: string;
      generated_count: number;
      skipped_existing: number;
      installment_ids: string[];
      recurrence_id: string | null;
      cached_replay: boolean;
      message?: string;
    }>(`/api/v1/contracts/${id}/generate-schedule`, {
      method: 'POST',
      headers: { 'Idempotency-Key': key },
    });
  },
};

// ── Sales Orders ───────────────────────────────────────────────────
export const salesOrdersApi = {
  list: () => apiFetch<any[]>('/api/v1/sales-orders/'),
  create: (payload: {
    customer_name: string; amount: number;
    issue_date: string; due_date: string; description?: string; customer_doc?: string;
  }) =>
    apiFetch<any>('/api/v1/sales-orders/', { method: 'POST', body: JSON.stringify(payload) }),
  confirm: (id: string) =>
    apiFetch<any>(`/api/v1/sales-orders/${id}/confirm`, { method: 'POST' }),
  invoice: (id: string) =>
    apiFetch<any>(`/api/v1/sales-orders/${id}/invoice`, { method: 'POST' }),
  cancel: (id: string) =>
    apiFetch<any>(`/api/v1/sales-orders/${id}`, { method: 'DELETE' }),
};

// ── PDV ────────────────────────────────────────────────────────────

export const pdvApi = {
  openRegister: (payload: OpenRegisterRequest) =>
    apiFetch<CashRegisterOut>('/api/v1/pdv/open', { method: 'POST', body: JSON.stringify(payload) }),
  getSession: () =>
    apiFetch<CashRegisterOut>('/api/v1/pdv/session'),
  registerSale: (registerId: string, payload: PDVSaleCreate) =>
    apiFetch<PDVSaleOut>(`/api/v1/pdv/sale?register_id=${registerId}`, {
      method: 'POST', body: JSON.stringify(payload),
    }),
  listSales: (registerId: string) =>
    apiFetch<PDVSaleOut[]>(`/api/v1/pdv/sales?register_id=${registerId}`),
  closeRegister: (registerId: string) =>
    apiFetch<CashRegisterOut>(`/api/v1/pdv/close?register_id=${registerId}`, { method: 'POST' }),

  /** Downloads the CSV report — uses the same interceptor */
  getReport: async (registerId: string) => {
    const token = auth.getAccessToken();
    const res = await fetch(`${BASE_URL}/api/v1/pdv/report/${registerId}`, {
      credentials: 'include',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new Error('Erro ao baixar relatório do caixa');
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `caixa_${registerId}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  },
};

// ── PCO ────────────────────────────────────────────────────────────
export const pcoApi = {
  list: () => apiFetch<any[]>('/api/v1/pco/'),
  create: (payload: any) =>
    apiFetch<any>('/api/v1/pco/', { method: 'POST', body: JSON.stringify(payload) }),
  get: (id: string) => apiFetch<any>(`/api/v1/pco/${id}`),
};

// ── Admin ──────────────────────────────────────────────────────────
export const adminApi = {
  getStats: () =>
    apiFetch<{
      total_users: number;
      active_accounts: number;
      total_transactions_volume: string;
      total_pdv_sales_volume: string;
    }>('/api/v1/admin/stats'),

  getUsers: (skip: number = 0, limit: number = 50) =>
    apiFetch<any[]>(`/api/v1/admin/users?skip=${skip}&limit=${limit}`),

  updateUserRole: (userId: string, role: string) =>
    apiFetch<any>(`/api/v1/admin/users/${userId}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    }),

  updateUserStatus: (userId: string, is_active: boolean) =>
    apiFetch<any>(`/api/v1/admin/users/${userId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ is_active }),
    }),

  getAuditLogs: (skip: number = 0, limit: number = 100) =>
    apiFetch<any[]>(`/api/v1/admin/audit-logs?skip=${skip}&limit=${limit}`),
};

// ── Billing & Notification API ──────────────────────────────────────
export interface BillingInvoice {
  id: string;
  business_id: string;
  customer_name: string;
  customer_phone?: string;
  customer_email?: string;
  customer_doc?: string;
  amount: number;
  due_date: string;
  status: 'PENDING' | 'PAID' | 'OVERDUE' | 'CANCELLED';
  pix_code?: string;
  pix_qr_url?: string;
  payment_method: 'PIX' | 'BOLETO' | 'CREDIT_CARD' | 'CASH';
  description?: string;
  notification_count: number;
  last_notification_sent_at?: string;
  created_by_name?: string;
  updated_by_name?: string;
  created_at: string;
  updated_at: string;
}

export interface BillingInvoiceCreate {
  customer_name: string;
  customer_phone?: string;
  customer_email?: string;
  customer_doc?: string;
  amount: number;
  due_date: string;
  payment_method?: string;
  description?: string;
}

export interface BillingNotificationOut {
  invoice_id: string;
  channel: string;
  recipient: string;
  whatsapp_url?: string;
  message_body: string;
  sent_at: string;
  status: string;
}

export interface BillingStats {
  total_invoices: number;
  pending_amount: string;
  paid_amount: string;
  overdue_amount: string;
  notifications_sent: number;
}

export const billingApi = {
  list: (statusFilter?: string) =>
    apiFetch<BillingInvoice[]>(`/api/v1/billing/${statusFilter ? `?status_filter=${statusFilter}` : ''}`),

  create: (payload: BillingInvoiceCreate) =>
    apiFetch<BillingInvoice>('/api/v1/billing/', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateStatus: (id: string, status: string) =>
    apiFetch<BillingInvoice>(`/api/v1/billing/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  notifyWhatsApp: (id: string) =>
    apiFetch<BillingNotificationOut>(`/api/v1/billing/${id}/notify/whatsapp`, {
      method: 'POST',
    }),

  notifyEmail: (id: string) =>
    apiFetch<BillingNotificationOut>(`/api/v1/billing/${id}/notify/email`, {
      method: 'POST',
    }),

  getStats: () =>
    apiFetch<BillingStats>('/api/v1/billing/stats'),

  batchSettle: (invoice_ids: string[], idempotencyKey?: string) =>
    apiFetch<{ status: string; settled_count: number; skipped_already_paid: number; total_amount_settled: number; invoice_ids: string[]; cached_replay?: boolean }>(
      '/api/v1/billing/batch-settle',
      {
        method: 'POST',
        headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : undefined,
        body: JSON.stringify({ invoice_ids }),
      }
    ),

  simulateBankWebhook: (provider: string, payload: { invoice_id: string; event_id?: string; status?: string; payment_method?: string; amount?: number }, idempotencyKey?: string) =>
    apiFetch<{ status: string; provider: string; invoice_id: string; new_status: string; event_id: string; whatsapp_dispatched: boolean; cached_replay?: boolean }>(
      `/api/v1/webhooks/banking/${encodeURIComponent(provider)}`,
      {
        method: 'POST',
        headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : undefined,
        body: JSON.stringify({
          status: 'PAID',
          ...payload,
        }),
      }
    ),
};

// ── Accounts (Mocked for Build) ────────────────────────────────────
export const accountsApi = {
  list: async (): Promise<any[]> => []
};

// ── CRM Cooperativa (Orbe Inho) ───────────────────────────────────────
export interface ContactPhoneEntry {
  number: string;
  type?: string; // PROPRIO | MAE | PAI | RECADO | WHATSAPP | COMERCIAL | RESIDENCIAL | OUTRO
  label?: string;
  is_whatsapp?: boolean;
  is_primary?: boolean;
}

export interface ContactEmailEntry {
  email: string;
  type?: string; // PRINCIPAL | PESSOAL | CORPORATIVO | FINANCEIRO | SECUNDARIO | OUTRO
  label?: string;
  is_primary?: boolean;
}

export interface ContactBankAccountEntry {
  bank_code?: string;
  bank_name?: string;
  agency?: string;
  account?: string;
  account_type?: string; // CONTA_CORRENTE | CONTA_POUPANCA | CONTA_CAPITAL_COOP | CONTA_SALARIO | CONTA_PAGAMENTO
  pix_key_type?: string;
  pix_key?: string;
  holder_name?: string;
  is_primary?: boolean;
}

export const BRAZILIAN_BANKS_CATALOG: { code: string; name: string }[] = [
  { code: '001', name: 'Banco do Brasil' },
  { code: '756', name: 'Sicoob' },
  { code: '748', name: 'Sicredi' },
  { code: '341', name: 'Itaú Unibanco' },
  { code: '237', name: 'Bradesco' },
  { code: '104', name: 'Caixa Econômica Federal' },
  { code: '033', name: 'Santander' },
  { code: '260', name: 'Nubank' },
  { code: '077', name: 'Banco Inter' },
  { code: '136', name: 'Unicred' },
  { code: '133', name: 'Cresol' },
  { code: '085', name: 'Ailos / Viacredi' },
  { code: '041', name: 'Banrisul' },
  { code: '336', name: 'C6 Bank' },
  { code: '403', name: 'Cora' },
  { code: '208', name: 'BTG Pactual' },
  { code: '422', name: 'Banco Safra' },
  { code: '290', name: 'PagBank' },
  { code: '323', name: 'Mercado Pago' },
];

export function resolveBankNameByCode(code?: string): string {
  if (!code) return '';
  const clean = code.trim().padStart(3, '0');
  const found = BRAZILIAN_BANKS_CATALOG.find((b) => b.code === clean || b.code === code.trim());
  return found ? found.name : '';
}
export interface CRMContactCreate {
  name: string;
  category: 'COOPERADO' | 'EMPLOYEE' | 'SUPPLIER' | 'CUSTOMER' | 'PARTNER';
  birth_date?: string;
  identity_number?: string;
  identity_issuer?: string;
  filiation?: string;
  mother_name?: string;
  father_name?: string;
  bank_code?: string;
  bank_name?: string;
  bank_agency?: string;
  bank_account?: string;
  bank_account_type?: string;
  pix_key_type?: string;
  pix_key?: string;
  phones?: ContactPhoneEntry[];
  emails?: ContactEmailEntry[];
  bank_accounts?: ContactBankAccountEntry[];
  nis?: string;
  correios_matricula?: string;
  address?: string;
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  role_title?: string;
  created_at?: string;
  updated_at?: string;
  document?: string;
  email?: string;
  phone?: string;
  bank_details?: string;
  notes?: string;
}

export interface CRMContactOut extends CRMContactCreate {
  id: string;
}

export interface AccountPayableCreate {
  cooperado_id?: string;
  supplier_id?: string;
  category_id?: string;
  supplier_name?: string;
  document?: string;
  amount: number;
  due_date: string;
  description?: string;
  payment_method?: string;
  payment_account?: string;
  notes?: string;
  status?: 'PENDING' | 'PAID' | 'CANCELLED' | 'OVERDUE';
}

export interface AccountPayableOut {
  id: string;
  business_id?: string;
  supplier_id?: string;
  category_id?: string;
  supplier_name?: string;
  document?: string;
  description: string;
  amount: number;
  due_date: string;
  paid_date?: string;
  payment_method?: string;
  payment_account?: string;
  notes?: string;
  status: 'PENDING' | 'PENDING_APPROVAL' | 'APPROVED' | 'PAID' | 'CANCELLED' | 'OVERDUE';
  created_at?: string;
  updated_at?: string;
}

export const crmApi = {
  getContacts: (category?: string) => {
    const cat = category === 'COOPERADO' ? 'PARTNER' : category;
    return apiFetch<CRMContactOut[]>(`/api/v1/crm/contacts/${cat ? `?category=${cat}` : ''}`);
  },

  getContact: (id: string) =>
    apiFetch<CRMContactOut>(`/api/v1/crm/contacts/${encodeURIComponent(id)}`),

  updateContact: (id: string, payload: Partial<CRMContactCreate>) =>
    apiFetch<CRMContactOut>(`/api/v1/crm/contacts/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify({
        ...payload,
        category: payload.category === 'COOPERADO' ? 'PARTNER' : payload.category,
      }),
    }),

  deleteContact: (id: string) =>
    apiFetch<void>(`/api/v1/crm/contacts/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),

  getContactTimeline: (id: string) =>
    apiFetch<{
      contact_id: string;
      upcoming_receivables: { id: string; amount: number; due_date: string; status: string; description?: string }[];
      last_received: { id: string; amount: number; due_date: string; status: string; description?: string }[];
      open_balance: number;
    }>(`/api/v1/crm/contacts/${encodeURIComponent(id)}/timeline`),

  _legacyGetContacts: (category?: string) => {
    const cat = category === 'COOPERADO' ? 'PARTNER' : category;
    return apiFetch<CRMContactOut[]>(`/api/v1/crm/contacts/${cat ? `?category=${cat}` : ''}`);
  },

  createContact: (payload: CRMContactCreate) =>
    apiFetch<CRMContactOut>('/api/v1/crm/contacts/', {
      method: 'POST',
      body: JSON.stringify({
        ...payload,
        category: payload.category === 'COOPERADO' ? 'PARTNER' : payload.category,
        email: payload.email || null,
        document: payload.document || null,
        phone: payload.phone || null,
        bank_details: payload.bank_details || null,
      }),
    }),

  // Cadastra cooperado; o backend cria automaticamente o contato PARTNER no CRM (visível no OrBrick)
  createCooperado: (payload: { name: string; document: string; email?: string; phone?: string; bank_details?: string }) =>
    apiFetch<{ id: string; name: string }>('/api/v1/crm/cooperados/', {
      method: 'POST',
      body: JSON.stringify({
        ...payload,
        email: payload.email || null,
        phone: payload.phone || null,
        bank_details: payload.bank_details || null,
      }),
    }),

  getWhatsappHistory: (recipient?: string) =>
    apiFetch<{ id: string; channel: string; recipient: string; message: string; status: string; created_at: string }[]>(
      `/api/v1/crm/whatsapp/history${recipient ? `?recipient=${encodeURIComponent(recipient)}` : ''}`
    ),

  sendWhatsapp: (payload: { phone: string; email?: string | null; message: string }) =>
    apiFetch<any>('/api/v1/crm/whatsapp/send', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getWhatsappQueue: () =>
    apiFetch<{ invoice_id: string; customer_name: string; customer_phone?: string; amount: number; due_date: string;
      step: string; scheduled_for: string; sent_at?: string; state: 'QUEUED' | 'SENT' | 'NO_PHONE' }[]>(
      '/api/v1/crm/whatsapp/queue'
    ),

  getPayables: () =>
    apiFetch<AccountPayableOut[]>('/api/v1/crm/payable/'),

  createPayable: (payload: AccountPayableCreate) => {
    const formattedDesc = payload.supplier_name
      ? payload.description
        ? `${payload.supplier_name} — ${payload.description}`
        : payload.supplier_name
      : payload.description || 'Despesa Operacional';
    const dueIso = payload.due_date.includes('T')
      ? payload.due_date
      : `${payload.due_date}T12:00:00Z`;
    return apiFetch<AccountPayableOut>('/api/v1/crm/payable/', {
      method: 'POST',
      body: JSON.stringify({
        description: formattedDesc,
        amount: Number(payload.amount),
        due_date: dueIso,
        payment_method: payload.payment_method || 'PIX',
        notes: payload.document ? `Doc: ${payload.document}${payload.notes ? ` | ${payload.notes}` : ''}` : payload.notes || null,
        supplier_id: payload.supplier_id || null,
        category_id: payload.category_id || null,
        status: payload.status || 'PENDING',
      }),
    });
  },

  updatePayable: (id: string, payload: Partial<AccountPayableOut>) =>
    apiFetch<AccountPayableOut>(`/api/v1/crm/payable/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  approvePayable: (id: string) =>
    apiFetch<AccountPayableOut>(`/api/v1/crm/payable/${id}/approve`, {
      method: 'POST',
    }),

  deletePayable: (id: string) =>
    apiFetch<void>(`/api/v1/crm/payable/${id}`, {
      method: 'DELETE',
    }),

  getPayableTotals: () =>
    apiFetch<{ pending: number; overdue: number; paid: number; total: number }>('/api/v1/crm/payable/summary/totals'),

  batchSettlePayables: (payableIds: string[], idempotencyKey?: string) => {
    const key = idempotencyKey || `batch-${payableIds.slice().sort().join('-')}-${Math.floor(Date.now() / 60000)}`;
    return apiFetch<{
      settled_count: number;
      settled_ids: string[];
      skipped_already_paid: number;
      idempotency_key: string | null;
      cached_replay: boolean;
    }>('/api/v1/crm/payable/batch-settle', {
      method: 'POST',
      headers: { 'Idempotency-Key': key },
      body: JSON.stringify({ payable_ids: payableIds, idempotency_key: key }),
    });
  },

  lookupCnpj: (cnpj: string) =>
    apiFetch<{
      cnpj: string;
      razao_social: string;
      nome_fantasia: string;
      email: string;
      ddd_telefone_1: string;
      cep: string;
      logradouro: string;
      numero: string;
      bairro: string;
      municipio: string;
      uf: string;
      provider: string;
      cached: boolean;
    }>(`/api/v1/crm/lookup/cnpj/${encodeURIComponent(cnpj.replace(/\D/g, ''))}`),

  lookupCep: (cep: string) =>
    apiFetch<{
      cep: string;
      street: string;
      neighborhood: string;
      city: string;
      state: string;
      provider: string;
      cached: boolean;
    }>(`/api/v1/crm/lookup/cep/${encodeURIComponent(cep.replace(/\D/g, ''))}`),

  // ── Módulo CBM (Consumer Behavior Management) & IA no OrBrick ──────
  getCbmInsights: () =>
    apiFetch<{
      business_id: string;
      business_name: string;
      total_monitored_contacts: number;
      avg_churn_risk_score: number;
      revenue_at_risk: number;
      total_ltv_monetary: number;
      lgpd_opt_in_rate_pct: number;
      risk_distribution: Record<string, number>;
      seasonality_clusters: Record<string, number>;
      active_campaigns_count: number;
      ai_orbrick_status: {
        business_id: string;
        kill_switch_active: boolean;
        ai_global_status: string;
        reason?: string | null;
        updated_at?: string | null;
        updated_by?: string | null;
      };
      top_priority_alerts: any[];
    }>('/api/v1/crm/cbm/insights'),

  getCbmChurnRisk: (riskLevel?: string) =>
    apiFetch<any[]>(
      `/api/v1/crm/cbm/churn-risk${riskLevel ? `?risk_level=${encodeURIComponent(riskLevel)}` : ''}`
    ),

  getCbmCampaigns: () =>
    apiFetch<any[]>('/api/v1/crm/cbm/campaigns'),

  createCbmCampaign: (payload: {
    name: string;
    trigger_type: string;
    channels: string[];
    ai_prompt_template?: string;
    is_active?: boolean;
    auto_dispatch?: boolean;
  }) =>
    apiFetch<any>('/api/v1/crm/cbm/campaigns', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  dispatchCbmCampaign: (campaignId: string) =>
    apiFetch<{
      campaign_id: string;
      campaign_name: string;
      eligible_contacts: number;
      dispatched_messages: number;
      channels: string[];
      whatsapp_delivery_code: string[];
      dispatched_at: string;
    }>(`/api/v1/crm/cbm/campaigns/${encodeURIComponent(campaignId)}/dispatch`, {
      method: 'POST',
    }),

  lgpdForgetContact: (contactId: string) =>
    apiFetch<{
      found: boolean;
      contact_id: string;
      business_id: string;
      opt_in_marketing: boolean;
      purged_cbm_profiles: number;
      anonymized_omnichannel_logs: number;
      status: string;
    }>(`/api/v1/crm/cbm/lgpd-forget/${encodeURIComponent(contactId)}`, {
      method: 'POST',
    }),

  getWhatsappAiStatus: (contactId?: string) =>
    apiFetch<{
      business_id: string;
      kill_switch_active: boolean;
      ai_global_status: string;
      reason?: string | null;
      contact_session?: {
        contact_id: string;
        contact_name: string;
        ai_attendance_enabled: boolean;
        human_operator_active: boolean;
        ai_handoff_until?: string | null;
      } | null;
    }>(`/api/v1/crm/whatsapp/ai-status${contactId ? `?contact_id=${encodeURIComponent(contactId)}` : ''}`),

  toggleWhatsappHandoff: (contactId: string, assumeHuman: boolean, durationHours: number = 24) =>
    apiFetch<{
      status: string;
      contact_id: string;
      contact_name: string;
      mode: string;
      ai_attendance_enabled: boolean;
      ai_handoff_until?: string | null;
    }>(`/api/v1/crm/whatsapp/handoff/${encodeURIComponent(contactId)}`, {
      method: 'POST',
      body: JSON.stringify({ assume_human: assumeHuman, duration_hours: durationHours }),
    }),

  toggleWhatsappKillSwitch: (active: boolean, reason?: string) =>
    apiFetch<{
      business_id: string;
      kill_switch_active: boolean;
      ai_global_status: string;
      reason?: string | null;
    }>('/api/v1/crm/whatsapp/kill-switch', {
      method: 'POST',
      body: JSON.stringify({ active, reason }),
    }),

  triggerWhatsappAiReply: (payload: {
    phone: string;
    incoming_message: string;
    contact_id?: string;
    simulate_ai_offline?: boolean;
  }) =>
    apiFetch<{
      status: string;
      ai_responded: boolean;
      intent?: string;
      blocked_injection?: boolean;
      injection_reason?: string | null;
      formatted_message?: string;
      requires_human_handoff?: boolean;
      receipt_triage_status?: string | null;
      invoice_status_mutated?: boolean;
      ai_engine_mode?: string;
      whatsapp_delivery_code: string[];
      reason?: string;
    }>('/api/v1/crm/whatsapp/ai-reply', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  listAiKnowledge: () =>
    apiFetch<{
      id: string;
      business_id: string;
      title: string;
      category: string;
      content: string;
      keywords?: string | null;
      is_active: boolean;
      created_at?: string | null;
      updated_at?: string | null;
    }[]>('/api/v1/crm/cbm/ai-knowledge'),

  createAiKnowledge: (payload: {
    title: string;
    category?: string;
    content: string;
    keywords?: string;
    is_active?: boolean;
  }) =>
    apiFetch<any>('/api/v1/crm/cbm/ai-knowledge', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  seedDefaultAiKnowledge: () =>
    apiFetch<any[]>('/api/v1/crm/cbm/ai-knowledge/seed-defaults', {
      method: 'POST',
    }),

  uploadAiKnowledgeDoc: (file: File, category: string = 'REGULAMENTO_ESTATUTO', replaceExisting: boolean = false) => {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('category', category);
    fd.append('replace_existing', String(replaceExisting));
    return apiFetch<{
      status: string;
      filename: string;
      total_characters_extracted: number;
      chunks_created: number;
      business_id: string;
      category: string;
      chunks: any[];
    }>('/api/v1/crm/cbm/ai-knowledge/upload-doc', {
      method: 'POST',
      body: fd,
    });
  },

  deleteAiKnowledge: (chunkId: string) =>
    apiFetch<{ status: string; id: string }>(`/api/v1/crm/cbm/ai-knowledge/${encodeURIComponent(chunkId)}`, {
      method: 'DELETE',
    }),

  getOrbrickChannelsQrHub: () =>
    apiFetch<any>('/api/v1/crm/orbrick/channels/qr-hub'),

  connectOrbrickChannel: (payload: {
    channel: 'WHATSAPP' | 'INSTAGRAM' | 'TELEGRAM';
    handle_or_id?: string;
    access_token?: string;
  }) =>
    apiFetch<any>('/api/v1/crm/orbrick/channels/connect', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  disconnectOrbrickChannel: (channel: 'WHATSAPP' | 'INSTAGRAM' | 'TELEGRAM') =>
    apiFetch<any>('/api/v1/crm/orbrick/channels/disconnect', {
      method: 'POST',
      body: JSON.stringify({ channel }),
    }),

  getAiPolicy: () =>
    apiFetch<{
      exists: boolean;
      status: string;
      draft_rules: {
        max_installments?: number | null;
        max_discount_pct?: number | null;
        max_extension_days?: number | null;
        tone_of_voice?: string;
      };
      approved_rules: {
        max_installments?: number | null;
        max_discount_pct?: number | null;
        max_extension_days?: number | null;
        tone_of_voice?: string;
      };
      source_excerpts: { rule: string; value: string; title: string; excerpt: string }[];
      has_conflict: boolean;
      conflict_notes?: string | null;
      approved_by_name?: string | null;
      approved_at?: string | null;
    }>('/api/v1/crm/cbm/ai-policy'),

  extractAiPolicy: () =>
    apiFetch<any>('/api/v1/crm/cbm/ai-policy/extract', { method: 'POST' }),

  approveAiPolicy: (payload: {
    max_installments?: number | null;
    max_discount_pct?: number | null;
    max_extension_days?: number | null;
    tone_of_voice?: string;
  }) =>
    apiFetch<any>('/api/v1/crm/cbm/ai-policy/approve', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};

// ── Cooperados (Módulo Cooperativismo) ───────────────────────────────
export interface CooperadoItem {
  birth_date?: string;
  identity_number?: string;
  identity_issuer?: string;
  filiation?: string;
  mother_name?: string;
  father_name?: string;
  bank_code?: string;
  bank_name?: string;
  bank_agency?: string;
  bank_account?: string;
  bank_account_type?: string;
  pix_key_type?: string;
  pix_key?: string;
  phones?: ContactPhoneEntry[];
  emails?: ContactEmailEntry[];
  bank_accounts?: ContactBankAccountEntry[];
  id: string;
  business_id: string;
  name: string;
  document: string;
  email?: string;
  phone?: string;
  bank_details?: string;
  notes?: string;
  status: 'PROPOSTA_CADASTRADA' | 'ANALISE_COMITE' | 'COTAS_LIQUIDADAS' | 'ATIVO' | 'DESLIGADO';
  created_at: string;
  updated_at: string;
}

export interface CooperadoBalance {
  cooperado_id: string;
  cooperado_name: string;
  period: string;
  total_charged: number;
  total_paid: number;
  total_overdue: number;
  total_pending: number;
  net_balance: number;
  entries: {
    id: string;
    type: string;
    description?: string;
    amount: number;
    due_date: string;
    status: string;
  }[];
}

export const cooperadosApi = {
  list: (params?: { status?: string; search?: string }) => {
    const q = new URLSearchParams();
    if (params?.status) q.set('status', params.status);
    if (params?.search) q.set('search', params.search);
    const qs = q.toString();
    return apiFetch<CooperadoItem[]>(`/api/v1/crm/cooperados/${qs ? `?${qs}` : ''}`);
  },
  create: (payload: {
    name: string;
    document: string;
    birth_date?: string;
    identity_number?: string;
    identity_issuer?: string;
    filiation?: string;
    mother_name?: string;
    father_name?: string;
    email?: string;
    phone?: string;
    bank_code?: string;
    bank_name?: string;
    bank_agency?: string;
    bank_account?: string;
    bank_account_type?: string;
    pix_key_type?: string;
    pix_key?: string;
    bank_details?: string;
    phones?: ContactPhoneEntry[];
    emails?: ContactEmailEntry[];
    bank_accounts?: ContactBankAccountEntry[];
    notes?: string;
    status?: string;
  }) =>
    apiFetch<CooperadoItem>('/api/v1/crm/cooperados/', {
      method: 'POST',
      body: JSON.stringify({
        ...payload,
        email: payload.email || null,
        phone: payload.phone || null,
        bank_details: payload.bank_details || null,
        notes: payload.notes || null,
      }),
    }),
  update: (id: string, payload: Partial<CooperadoItem>) =>
    apiFetch<CooperadoItem>(`/api/v1/crm/cooperados/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  delete: (id: string) =>
    apiFetch<void>(`/api/v1/crm/cooperados/${id}`, {
      method: 'DELETE',
    }),
  getBalance: (id: string) =>
    apiFetch<CooperadoBalance>(`/api/v1/crm/cooperados/${id}/balance`),
  previewRateioSobras: (valorTotalSobras: number, anoExercicio?: number) => {
    const params = new URLSearchParams({ valor_total_sobras: String(valorTotalSobras) });
    if (anoExercicio) params.set('ano_exercicio', String(anoExercicio));
    return apiFetch<{
      ano_exercicio: number;
      periodo_inicio: string;
      periodo_fim: string;
      valor_total_sobras: number;
      movimentacao_global_12m: number;
      total_cooperados_elegiveis: number;
      itens: {
        cooperado_id: string;
        cooperado_name: string;
        document: string;
        status: string;
        aportes_pagos_12m: number;
        repasses_recebidos_12m: number;
        movimentacao_total_12m: number;
        participacao_percentual: number;
        cota_sobras: number;
      }[];
    }>(`/api/v1/crm/cooperados/rateio-sobras?${params.toString()}`);
  },
  applyRateioSobras: (payload: { valor_total_sobras: number; ano_exercicio?: number; due_date?: string; description_prefix?: string }, idempotencyKey?: string) =>
    apiFetch<{
      status: string;
      ano_exercicio: number;
      valor_total_sobras: number;
      created_payables_count: number;
      total_distributed: number;
      payable_ids: string[];
      cached_replay?: boolean;
    }>('/api/v1/crm/cooperados/rateio-sobras/aplicar', {
      method: 'POST',
      headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : undefined,
      body: JSON.stringify(payload),
    }),
  getInformeRendimentos: (cooperadoId: string, anoCalendario?: number) =>
    apiFetch<{
      ano_calendario: number;
      fonte_pagadora: { nome: string; cnpj: string; regime: string };
      beneficiario: { id: string; nome: string; documento: string; matricula_nis: string; email?: string; status: string };
      quadro_3_rendimentos_tributaveis: { rendimentos_brutos_producao: number; contribuicao_previdenciaria_inss: number; imposto_renda_retido_irrf: number; taxa_administrativa_fates: number; rendimentos_liquidos_pagos: number };
      quadro_4_rendimentos_isentos_exclusivos: { sobras_liquidas_ago_distribuicao: number; capital_social_integralizado_no_ano: number };
      quadro_7_bens_e_direitos: { saldo_quotas_capital_social_acumulado: number; discriminacao: string };
      historico_repasses_ano: { id: string; date: string; description: string; valor_bruto: number; inss_retido: number; irrf_retido: number; taxa_adm: number; valor_liquido: number; status: string }[];
      gerado_em: string;
    }>(`/api/v1/crm/cooperados/${cooperadoId}/informe-rendimentos${anoCalendario ? `?ano_calendario=${anoCalendario}` : ''}`),
};

// ── Recurrences (Agendamentos de Recebimentos e Pagamentos) ──────────
export interface RecurrenceItem {
  id: string;
  business_id: string;
  category_id?: string;
  crm_contact_id?: string;
  cooperado_id?: string;
  description: string;
  amount: number;
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'ANNUAL';
  first_due_date: string;
  next_due_date?: string;
  parcel_total?: number;
  parcel_current: number;
  status: 'ACTIVE' | 'PAUSED' | 'CANCELLED' | 'COMPLETED';
  payment_method: 'PIX' | 'BOLETO' | 'CREDIT_CARD' | 'CASH';
  created_at: string;
  updated_at: string;
}

export const recurrencesApi = {
  list: (status?: string) =>
    apiFetch<RecurrenceItem[]>(`/api/v1/recurrences/${status ? `?status=${status}` : ''}`),
  create: (payload: {
    description: string;
    amount: number;
    frequency: string;
    first_due_date: string;
    parcel_total?: number;
    payment_method?: string;
    crm_contact_id?: string;
    cooperado_id?: string;
    category_id?: string;
  }) =>
    apiFetch<RecurrenceItem>('/api/v1/recurrences/', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  pause: (id: string) =>
    apiFetch<RecurrenceItem>(`/api/v1/recurrences/${id}/pause`, { method: 'POST' }),
  resume: (id: string) =>
    apiFetch<RecurrenceItem>(`/api/v1/recurrences/${id}/resume`, { method: 'POST' }),
  cancel: (id: string) =>
    apiFetch<{ message: string }>(`/api/v1/recurrences/${id}`, { method: 'DELETE' }),
  getProjection: (id: string, cycles: number = 6) =>
    apiFetch<{ projection: { parcel: number; due_date: string; amount: number }[] }>(
      `/api/v1/recurrences/${id}/projection?cycles=${cycles}`
    ),
};

// ── Plano de Contas (Categories) ─────────────────────────────────────
export interface AccountCategoryItem {
  id: string;
  business_id: string;
  parent_id?: string;
  name: string;
  type: 'REVENUE' | 'COST' | 'EXPENSE' | 'TAX' | 'TRANSFER';
  is_active: boolean;
  created_at: string;
}

export const categoriesApi = {
  list: (catType?: string) =>
    apiFetch<AccountCategoryItem[]>(`/api/v1/categories/${catType ? `?cat_type=${catType}` : ''}`),
  create: (payload: { name: string; type: string; parent_id?: string }) =>
    apiFetch<AccountCategoryItem>('/api/v1/categories/', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  update: (id: string, payload: { name?: string; type?: string; is_active?: boolean }) =>
    apiFetch<AccountCategoryItem>(`/api/v1/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  delete: (id: string) =>
    apiFetch<void>(`/api/v1/categories/${id}`, { method: 'DELETE' }),
};

// ── Contabilidade & Fechamento de Mês (Accounting) ───────────────────
export interface MonthCloseItem {
  id: string;
  business_id: string;
  period_year: number;
  period_month: number;
  closed_by_id: string;
  closed_by_name: string;
  checksum: string;
  summary_json: string;
  closed_at: string;
}

export const accountingApi = {
  listMonthCloses: () =>
    apiFetch<MonthCloseItem[]>('/api/v1/accounting/month-closes'),
  createMonthClose: (payload: { period_year: number; period_month: number }) =>
    apiFetch<MonthCloseItem>('/api/v1/accounting/month-close', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};

// ── Funil de Vendas Kanban (CRM Deals) ───────────────────────────────
export interface CRMDealItem {
  id: string;
  business_id: string;
  contact_id?: string;
  title: string;
  value: number;
  stage: 'PROSPECTING' | 'PRESENTATION' | 'NEGOTIATION' | 'WON' | 'LOST';
  status: 'ACTIVE' | 'ARCHIVED';
  loss_reason?: string;
  created_at: string;
  updated_at: string;
}

export const dealsApi = {
  list: (stage?: string) =>
    apiFetch<CRMDealItem[]>(`/api/v1/crm/deals${stage ? `?stage=${stage}` : ''}`),
  create: (payload: { title: string; value: number; stage?: string; contact_id?: string }) =>
    apiFetch<CRMDealItem>('/api/v1/crm/deals', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  update: (id: string, payload: Partial<CRMDealItem>) =>
    apiFetch<CRMDealItem>(`/api/v1/crm/deals/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
};

// ── Relatórios & BI (Reports) ────────────────────────────────────────
export const reportsApi = {
  getDre: (params?: { year?: number; month?: number; regime?: string }) => {
    const q = new URLSearchParams();
    if (params?.year) q.set('year', String(params.year));
    if (params?.month) q.set('month', String(params.month));
    if (params?.regime) q.set('regime', params.regime);
    const qs = q.toString();
    return apiFetch<any>(`/api/v1/reports/dre${qs ? `?${qs}` : ''}`);
  },
  getAging: () =>
    apiFetch<{ buckets: { '0_30': number; '31_60': number; '61_90': number; '90_plus': number }; total_overdue: number }>('/api/v1/reports/aging'),
  getBudget: (params?: { year?: number; month?: number }) => {
    const q = new URLSearchParams();
    if (params?.year) q.set('year', String(params.year));
    if (params?.month) q.set('month', String(params.month));
    const qs = q.toString();
    return apiFetch<any>(`/api/v1/reports/budget-vs-actual${qs ? `?${qs}` : ''}`);
  },
  getCashflow: () =>
    apiFetch<{ horizon_months: number; projection: { period: string; inflow: number; outflow: number; net: number }[] }>('/api/v1/reports/cashflow'),
  getLosses: () =>
    apiFetch<{ start_date: string; end_date: string; total_loss: number; losses: { invoice_id: string; customer_name: string; amount: number; due_date: string; status: string }[] }>('/api/v1/reports/losses'),
};

// ── Configurações Globais (API Tokens & Integrações Bancárias) ───────
export interface ApiTokenItem {
  id: string;
  business_id: string;
  name: string;
  token_hash: string;
  created_by_id: string;
  expires_at?: string;
  created_at: string;
  plain_token?: string;
}

export interface BankIntegrationItem {
  id: string;
  business_id: string;
  bank_name: string;
  webhook_url?: string;
  is_active: boolean;
  created_at: string;
}

export const settingsApi = {
  getSettings: () => apiFetch<any>('/api/v1/settings'),
  listTokens: () => apiFetch<ApiTokenItem[]>('/api/v1/settings/api-tokens'),
  createToken: (name: string) =>
    apiFetch<ApiTokenItem>('/api/v1/settings/api-tokens', {
      method: 'POST',
      body: JSON.stringify({ name }),
    }),
  revokeToken: (id: string) =>
    apiFetch<{ message: string }>(`/api/v1/settings/api-tokens/${id}`, {
      method: 'DELETE',
    }),
  listBanks: () => apiFetch<BankIntegrationItem[]>('/api/v1/settings/bank-integrations'),
  createBank: (payload: { bank_name: string; api_key: string }) =>
    apiFetch<BankIntegrationItem>('/api/v1/settings/bank-integrations', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  deleteBank: (id: string) =>
    apiFetch<{ message: string }>(`/api/v1/settings/bank-integrations/${id}`, {
      method: 'DELETE',
    }),
  rotateSecrets: () =>
    apiFetch<{
      status: string;
      rotated_bank_integrations: number;
      rotated_totp_secrets: number;
      rotated_at: string;
    }>('/api/v1/settings/rotate-secrets', {
      method: 'POST',
    }),
  getTelemetry: () =>
    apiFetch<{
      status: string;
      timestamp: string;
      monitored_routes: number;
      max_capacity?: number;
      endpoints: {
        route: string;
        requests: number;
        avg_ms: number;
        max_ms: number;
        slow_requests_gt_500ms: number;
        errors_5xx: number;
      }[];
    }>('/api/v1/telemetry/metrics'),
};

// ── Open Finance Brasil (BACEN Fase 2 & Fase 3 ITP) ──────────────────
export interface OpenFinanceBankMeta {
  code: string;
  ispb: string;
  name: string;
  short_name: string;
  is_cooperative: boolean;
  open_finance_phases: string[];
}

export interface OpenFinanceConsentItem {
  id: string;
  business_id: string;
  bank_name: string;
  institution_full_name: string;
  compe_code: string;
  ispb: string;
  is_cooperative_bank: boolean;
  consent_urn: string;
  webhook_url?: string;
  is_active: boolean;
  scopes: string[];
  created_at: string;
}

export const openFinanceApi = {
  getDirectory: (params?: { search?: string; only_cooperativas?: boolean }) => {
    const q = new URLSearchParams();
    if (params?.search) q.set('search', params.search);
    if (params?.only_cooperativas) q.set('only_cooperativas', 'true');
    const qs = q.toString();
    return apiFetch<{ total: number; items: OpenFinanceBankMeta[] }>(
      `/api/v1/open-finance/directory${qs ? `?${qs}` : ''}`
    );
  },
  listConsents: () =>
    apiFetch<OpenFinanceConsentItem[]>('/api/v1/open-finance/consents'),
  createConsent: (payload: {
    bank_code: string;
    aggregator?: string;
    client_secret_or_token: string;
    account_branch?: string;
    account_number?: string;
  }) =>
    apiFetch<OpenFinanceConsentItem>('/api/v1/open-finance/consents', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  linkCooperadoAccount: (
    cooperadoId: string,
    payload: {
      bank_code: string;
      bank_name?: string;
      ispb?: string;
      branch: string;
      account_number: string;
      account_type?: string;
      pix_key: string;
      pix_key_type?: string;
    }
  ) =>
    apiFetch<{
      status: string;
      cooperado_id: string;
      cooperado_name: string;
      bank_details: string;
    }>(`/api/v1/open-finance/cooperado-account/${cooperadoId}`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  syncStatement: (payload?: { auto_reconcile_pending_cotas?: boolean }) =>
    apiFetch<{
      status: string;
      business_id: string;
      reconciled_count: number;
      reconciled_invoice_ids: string[];
      upgraded_cooperado_ids: string[];
      synced_at: string;
    }>('/api/v1/open-finance/sync-statement', {
      method: 'POST',
      body: JSON.stringify(payload || { auto_reconcile_pending_cotas: true }),
    }),
  initiatePixPayout: (payload: {
    cooperado_id: string;
    payable_id?: string;
    amount?: number;
    description?: string;
  }) =>
    apiFetch<{
      status: string;
      end_to_end_id: string;
      cooperado_id: string;
      cooperado_name: string;
      amount: number;
      bank_details: string;
      settled_at: string;
    }>('/api/v1/open-finance/pix-payout', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};


export const terminalApi = {
  getConnectionToken: () =>
    apiFetch<{ secret: string; business_id: string }>('/api/v1/terminal/connection_token', {
      method: 'POST',
    }),

  registerReader: (payload: { registration_code: string; label: string; location_id?: string }) =>
    apiFetch<{
      id: string;
      stripe_reader_id: string;
      label: string;
      device_type: string;
      status: string;
      ip_address?: string;
      serial_number?: string;
      created_at: string;
    }>('/api/v1/terminal/readers/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  listReaders: () =>
    apiFetch<{
      id: string;
      stripe_reader_id: string;
      label: string;
      device_type: string;
      status: string;
      ip_address?: string;
      serial_number?: string;
      created_at: string;
    }[]>('/api/v1/terminal/readers'),

  createPayment: (payload: {
    reader_id: string;
    amount_cents: number;
    cash_register_id?: string;
    customer_name?: string;
    description?: string;
  }) =>
    apiFetch<{
      payment_intent_id: string;
      status: string;
      reader_id: string;
      amount_cents: number;
      amount_formatted: string;
      client_secret?: string;
    }>('/api/v1/terminal/create_payment', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  cancelPayment: (reader_id: string) =>
    apiFetch<{
      status: string;
      reader_id: string;
      message: string;
    }>('/api/v1/terminal/cancel_payment', {
      method: 'POST',
      body: JSON.stringify({ reader_id }),
    }),
};

export const copilotApi = {
  operatorAssist: (payload: {
    query: string;
    vertical?: string;
    current_cart?: Array<{ name: string; quantity: number; unit_price: number; barcode?: string }>;
    cooperado_id?: string;
  }) =>
    apiFetch<{
      reply: string;
      vertical: string;
      action_type: string;
      cross_sell_suggestions: Array<{ item_name: string; reason: string; suggested_price?: string }>;
      scale_data?: any;
      tax_breakdown?: any;
      timestamp: string;
    }>('/api/v1/copilot/operator_assist', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  decodeScaleTag: (barcode: string) =>
    apiFetch<{
      is_scale_barcode: boolean;
      product_code: string;
      total_price?: number;
      weight_kg?: number;
      interpretation: string;
    }>('/api/v1/copilot/decode_scale_tag', {
      method: 'POST',
      body: JSON.stringify({ barcode }),
    }),

  cashReconcile: (payload: {
    cash_register_id?: string;
    register_id?: string;
    physical_cash?: number;
    counted_cash?: number;
    card_receipts?: number;
    counted_checks?: number;
    pix_total?: number;
    counted_pix?: number;
  }) =>
    apiFetch<{
      cash_register_id: string;
      system_expected_total: number;
      actual_counted_total: number;
      difference: number;
      status: string;
      ai_audit_justification: string;
    }>('/api/v1/copilot/cash_reconcile', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};


export interface OrbeJobsLivingCV {
  id: string;
  business_id: string;
  user_id: string;
  full_name: string;
  headline?: string;
  target_roles: string[];
  json_resume: {
    basics: { name: string; label: string; email: string; summary: string };
    work: Array<{ name: string; position: string; startDate?: string; summary?: string }>;
    education: Array<Record<string, any>>;
    certificates: Array<{ name: string; issuer: string; date?: string }>;
    skills: Array<{ name: string; keywords: string[] }>;
    languages: Array<{ language: string; fluency: string }>;
  };
  human_in_the_loop: boolean;
  daily_send_limit: number;
  kill_switch_active: boolean;
  whatsapp_source_phone?: string;
  last_pdf_sha256?: string;
  updated_at?: string;
}

export interface OrbeJobsApplication {
  id: string;
  job_url_hash: string;
  company_name: string;
  job_title: string;
  job_url: string;
  recipient_email?: string;
  stage: string;
  match_score: number;
  tailored_cover_letter?: string;
  ai_provider_used?: string;
  requires_approval: boolean;
  approved_by_human: boolean;
  applied_at?: string;
  updated_at?: string;
}

export const orbejobsApi = {
  getDashboard: () =>
    apiFetch<{
      business_id: string;
      profile: OrbeJobsLivingCV;
      daily_quota: { sent_today: number; daily_send_limit: number; hard_cap: number; remaining_today: number };
      oauth_vault: { connected: boolean; provider: string; account_email?: string; scopes?: string; cipher_algorithm: string };
      listings_count: number;
      stage_counts: Record<string, number>;
      applications: OrbeJobsApplication[];
      queue: Array<{
        id: string;
        application_id: string;
        recipient_email: string;
        subject: string;
        mx_valid: boolean;
        status: string;
        jitter_seconds: number;
        error_message?: string;
        sent_at?: string;
      }>;
    }>('/api/v1/orbejobs/dashboard'),

  updateLivingCv: (payload: {
    full_name?: string;
    headline?: string;
    target_roles?: string[];
    json_resume?: Record<string, any>;
    human_in_the_loop?: boolean;
    daily_send_limit?: number;
  }) =>
    apiFetch<OrbeJobsLivingCV>('/api/v1/orbejobs/living-cv', {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  whatsappUpdate: (payload: { message: string; phone?: string }) =>
    apiFetch<{ actions: string[]; profile: OrbeJobsLivingCV }>('/api/v1/orbejobs/living-cv/whatsapp-update', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  uploadPdf: (file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    return apiFetch<{ filename: string; pdf_sha256: string; extracted_chars: number; profile: OrbeJobsLivingCV }>(
      '/api/v1/orbejobs/living-cv/upload-pdf',
      { method: 'POST', body: fd }
    );
  },

  triggerScrape: (payload: {
    greenhouse_boards?: string[];
    lever_companies?: string[];
    rss_feeds?: string[];
    manual_jobs?: Array<{
      company_name: string;
      title: string;
      job_url: string;
      recipient_email?: string;
      description_text?: string;
    }>;
  }) =>
    apiFetch<{ scraped_total: number; inserted_listings: number; created_kanban_cards: number }>(
      '/api/v1/orbejobs/scrape',
      { method: 'POST', body: JSON.stringify(payload) }
    ),

  createApplication: (payload: {
    company_name: string;
    job_title: string;
    job_url: string;
    recipient_email?: string;
    description_text?: string;
  }) =>
    apiFetch<OrbeJobsApplication>('/api/v1/orbejobs/applications', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateApplicationStage: (
    appId: string,
    payload: { stage?: string; approved_by_human?: boolean; recipient_email?: string }
  ) =>
    apiFetch<OrbeJobsApplication>(`/api/v1/orbejobs/applications/${appId}/stage`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  tailorApplication: (appId: string) =>
    apiFetch<{ application: OrbeJobsApplication; ai_provider: string; cache_hit: boolean; pgvector_score: number }>(
      `/api/v1/orbejobs/applications/${appId}/tailor`,
      { method: 'POST', body: JSON.stringify({ simulate_offline: false }) }
    ),

  saveGmailVault: (payload: { account_email: string; access_token: string; refresh_token?: string }) =>
    apiFetch<{ connected: boolean; provider: string; account_email: string; cipher_algorithm: string }>(
      '/api/v1/orbejobs/oauth/gmail/vault',
      { method: 'POST', body: JSON.stringify(payload) }
    ),

  checkDnsMx: (email: string) =>
    apiFetch<{ email: string; mx_valid: boolean; mx_hosts: string[]; error?: string }>(
      '/api/v1/orbejobs/dns-mx/check',
      { method: 'POST', body: JSON.stringify({ email }) }
    ),

  enqueueSend: (payload: { application_id: string; recipient_email?: string; auto_dispatch?: boolean }) =>
    apiFetch<{ queue_id: string; status: string; mx_valid: boolean; jitter_seconds: number }>(
      '/api/v1/orbejobs/queue/enqueue',
      { method: 'POST', body: JSON.stringify(payload) }
    ),

  dispatchQueueItem: (queueId: string) =>
    apiFetch<{ status: string; gmail_message_id?: string; detail?: string }>(
      `/api/v1/orbejobs/queue/${queueId}/dispatch`,
      { method: 'POST' }
    ),

  toggleKillSwitch: (active: boolean, reason?: string) =>
    apiFetch<{ kill_switch_active: boolean; reason: string }>('/api/v1/orbejobs/kill-switch', {
      method: 'POST',
      body: JSON.stringify({ active, reason }),
    }),

  getLgpdAudit: () =>
    apiFetch<{
      send_logs: Array<{
        id: string;
        recipient_email: string;
        gmail_message_id?: string;
        mx_host?: string;
        status: string;
        latency_ms: number;
        lgpd_audit_hash: string;
        detail?: string;
        created_at: string;
      }>;
      audit_events: Array<{ id: string; entity: string; action: string; detail?: string; timestamp: string }>;
    }>('/api/v1/orbejobs/lgpd/audit'),

  purgeLgpdData: () =>
    apiFetch<{ status: string; lgpd_art_18: boolean }>('/api/v1/orbejobs/lgpd/purge', {
      method: 'DELETE',
    }),
};


// ── INHO Turismo Vertical (AI-First / Human-Last · Orbe Systems) ──────
export const turismoApi = {
  getOverview: () => apiFetch<any>('/api/v1/turismo/overview'),
  listQuotes: () => apiFetch<any[]>('/api/v1/turismo/quotes'),
  createQuote: (payload: {
    client_name: string;
    origin: string;
    destination: string;
    departure_date?: string;
    return_date?: string;
    passengers?: number;
    airline_program?: string;
    cash_price_brl: number;
    miles_required?: number;
    mile_cost_per_k_brl?: number;
    tax_fees_brl?: number;
    is_public_offer?: boolean;
  }) =>
    apiFetch<any>('/api/v1/turismo/quotes', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  importPnr: (payload: { pnr_raw_text: string; client_name?: string; cash_price_brl?: number; miles_required?: number }) =>
    apiFetch<any>('/api/v1/turismo/quotes/import-pnr', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getPublicProposta: (slug: string) =>
    apiFetch<any>(`/api/v1/turismo/public/proposta/${encodeURIComponent(slug)}`),
  selectPublicProposta: (slug: string, selected_option: 'A' | 'B' | 'C') =>
    apiFetch<any>(`/api/v1/turismo/public/proposta/${encodeURIComponent(slug)}/select`, {
      method: 'POST',
      body: JSON.stringify({ selected_option }),
    }),
  listMiles: () => apiFetch<any[]>('/api/v1/turismo/miles'),
  createMiles: (payload: {
    program_name: string;
    holder_name: string;
    holder_document: string;
    miles_balance: number;
    cpfs_used_year: number;
    cpfs_limit_year?: number;
  }) =>
    apiFetch<any>('/api/v1/turismo/miles', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  useMilesCpf: (id: string) =>
    apiFetch<any>(`/api/v1/turismo/miles/${encodeURIComponent(id)}/use-cpf`, { method: 'PATCH' }),
  getDre: () => apiFetch<any>('/api/v1/turismo/dre'),
  runBoardingRadar: () => apiFetch<any>('/api/v1/turismo/boarding-radar/run', { method: 'POST' }),
  listGroups: () => apiFetch<any[]>('/api/v1/turismo/groups'),
  createGroup: (payload: { group_name: string; destination: string; price_per_person_brl: number }) =>
    apiFetch<any>('/api/v1/turismo/groups', { method: 'POST', body: JSON.stringify(payload) }),
  listClub: () => apiFetch<any[]>('/api/v1/turismo/club'),
  createClubMember: (payload: { member_name: string; member_email: string; telegram_chat_id?: string }) =>
    apiFetch<any>('/api/v1/turismo/club', { method: 'POST', body: JSON.stringify(payload) }),
  broadcastClub: (payload: { title: string; message: string }) =>
    apiFetch<any>('/api/v1/turismo/club/broadcast', { method: 'POST', body: JSON.stringify(payload) }),
  getChannels: () => apiFetch<any>('/api/v1/turismo/channels'),
  saveChannels: (payload: any) =>
    apiFetch<any>('/api/v1/turismo/channels', { method: 'POST', body: JSON.stringify(payload) }),
  testOmnichannelInbound: (payload: {
    channel: 'WHATSAPP' | 'INSTAGRAM' | 'TELEGRAM';
    sender_ref: string;
    message_text: string;
  }) =>
    apiFetch<any>('/api/v1/turismo/omnichannel/inbound', { method: 'POST', body: JSON.stringify(payload) }),
};

export interface CepSearchResult {
  cep: string;
  logradouro: string;
  complemento?: string;
  bairro: string;
  localidade: string;
  uf: string;
}

/** Busca reversa: UF + cidade + logradouro -> lista de CEPs (ViaCEP). */
export async function searchCepByAddress(uf: string, city: string, street: string): Promise<CepSearchResult[]> {
  const u = (uf || '').trim().toUpperCase();
  const c = (city || '').trim();
  const s = (street || '').trim();
  if (u.length !== 2 || c.length < 3 || s.length < 3) {
    throw new Error('Informe UF, cidade e ao menos 3 letras do logradouro para buscar o CEP.');
  }
  const res = await fetch(
    `https://viacep.com.br/ws/${encodeURIComponent(u)}/${encodeURIComponent(c)}/${encodeURIComponent(s)}/json/`
  );
  if (!res.ok) throw new Error('Não foi possível consultar o CEP pelo endereço.');
  const data = await res.json();
  if (!Array.isArray(data) || data.length === 0) throw new Error('Nenhum CEP encontrado para esse endereço.');
  return data.slice(0, 20) as CepSearchResult[];
}

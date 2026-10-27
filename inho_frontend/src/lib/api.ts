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
export interface CRMContactCreate {
  name: string;
  category: 'COOPERADO' | 'EMPLOYEE' | 'SUPPLIER' | 'CUSTOMER';
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
  status: 'PENDING' | 'PAID' | 'CANCELLED' | 'OVERDUE';
  created_at?: string;
  updated_at?: string;
}

export const crmApi = {
  getContacts: (category?: string) => {
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
};

// ── Cooperados (Módulo Cooperativismo) ───────────────────────────────
export interface CooperadoItem {
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
    email?: string;
    phone?: string;
    bank_details?: string;
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

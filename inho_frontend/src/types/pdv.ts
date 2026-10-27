/**
 * INHO – PDV (Frente de Caixa) Typings
 * Espelha rigorosamente os modelos de Pydantic FastAPI para o PDV (Schemas).
 */

export type CashRegisterStatus = 'OPEN' | 'CLOSED';
export type PaymentMethod = 'CASH' | 'PIX' | 'CREDIT' | 'DEBIT' | 'OTHER';

export interface OpenRegisterRequest {
    opening_balance: number; // gt 0
}

export interface CashRegisterOut {
    id: string; // UUID
    operator_id: string | null;
    opening_balance: number;
    closing_balance: number | null;
    status: CashRegisterStatus;
    opened_at: string;
    closed_at: string | null;
}

export interface PDVSaleCreate {
    customer_name?: string;
    total_amount: number; // gt 0
    payment_method: PaymentMethod;
    description?: string;
}

export interface PDVSaleOut {
    id: string; // UUID
    cash_register_id: string; // UUID
    customer_name: string | null;
    total_amount: number;
    payment_method: PaymentMethod;
    description: string | null;
    created_at: string;
}

/**
 * INHO – Sales Orders Typings
 * Define o modelo de dados e a restrita Máquina de Estados (State Machine) 
 * que governa o clico de vida do Pedido de Venda.
 */

export type SalesOrderStatus = 'DRAFT' | 'CONFIRMED' | 'INVOICED' | 'CANCELLED';

export interface SalesOrderCreate {
    customer_name: string; // min 1, max 255
    customer_doc?: string; // opcional
    description?: string;  // opcional
    amount: number;        // gt 0
    issue_date: string;    // ISO Date
    due_date: string;      // ISO Date
}

export interface SalesOrderOut {
    id: string; // UUID
    customer_name: string;
    customer_doc: string | null;
    description: string | null;
    amount: number;
    status: SalesOrderStatus;
    invoice_number: string | null;
    nfe_key: string | null;
    nfe_status: string | null;
    issue_date: string;
    due_date: string;
    created_at: string;
}

/**
 * INHO – Contracts Typings
 * Espelha rigorosamente os Pydantic models da API Serverless.
 */

export type ContractStatus = 'ACTIVE' | 'SUSPENDED' | 'EXPIRED' | 'CANCELLED';
export type RecordType = 'PAYABLE' | 'RECEIVABLE';

export interface ContractCreate {
    title: string;                 // min 1, max 255
    contact_name: string;          // min 1, max 255
    contact_doc?: string;          // opcional
    record_type: RecordType;
    total_value: number;           // gt 0
    installments: number;          // ge 1
    frequency?: string;            // opcional
    start_date: string;            // ISO datetime
    end_date?: string;             // ISO datetime, opcional
}

export interface ContractOut {
    id: string;                    // UUID
    title: string;
    contact_name: string;
    contact_doc: string | null;
    record_type: RecordType;
    total_value: number;
    installments: number;
    frequency: string | null;
    start_date: string;
    end_date: string | null;
    status: ContractStatus;
    created_at: string;
}

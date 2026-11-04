"""Maquina de estados do emprestimo P2P (p2p_loans.status) - Manual 11, Fase 4.

requested -> handed_over -> returned | late -> returned ; requested -> cancelled.
Funcoes puras: a persistencia (UPDATE ... WHERE status = :atual, idempotente) fica na camada de API.
"""
from __future__ import annotations

from datetime import datetime

TRANSITIONS = {
    "requested": {"handed_over", "cancelled"},
    "handed_over": {"returned", "late"},
    "late": {"returned"},
    "returned": set(),
    "cancelled": set(),
}


def can_transition(current: str, new: str) -> bool:
    return new in TRANSITIONS.get(current, set())


def next_status(current: str, new: str) -> str:
    if not can_transition(current, new):
        raise ValueError(f"transicao invalida: {current} -> {new}")
    return new


def returned_on_time(due_at: datetime, returned_at: datetime) -> bool:
    return returned_at <= due_at


def is_overdue(status: str, due_at: datetime, now: datetime) -> bool:
    return status == "handed_over" and now > due_at
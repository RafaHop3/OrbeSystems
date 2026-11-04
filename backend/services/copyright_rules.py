"""Regra de dominio publico no Brasil (Lei 9.610/98, art. 41): 70 anos contados de 1o/jan do ano seguinte a morte."""
import datetime


def is_public_domain_br(death_year: int, today: datetime.date | None = None) -> bool:
    today = today or datetime.date.today()
    return today.year >= death_year + 71

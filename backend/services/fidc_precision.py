"""
services/fidc_precision.py — Motor de Precisão Numérica Pro-Rata (FIDC)
═══════════════════════════════════════════════════════════════════════
Garante cálculos intermediários em `NUMERIC(18,8)` (taxas diárias, deságios
de RPV e Preço Unitário de cotas) e liquidação monetária final em
`NUMERIC(15,2)` com arredondamento bancário estrito (`ROUND_HALF_EVEN`).
"""

from decimal import Decimal, ROUND_HALF_EVEN, localcontext

Q_INTERMEDIATE = Decimal("0.00000001")  # NUMERIC(18,8)
Q_MONETARY = Decimal("0.01")            # NUMERIC(15,2)


def calculate_fidc_pro_rata(
    face_value: Decimal | str | float,
    annual_discount_rate: Decimal | str | float,
    business_days: int,
    initial_quota_pu: Decimal | str | float = Decimal("1000.00000000"),
) -> dict[str, Decimal]:
    """
    Calcula o deságio Pro-Rata Die (base 252 dias úteis padrão B3/ANBIMA)
    operando com precisão de 8 casas decimais nas taxas intermediárias e
    arredondamento `ROUND_HALF_EVEN` no valor líquido final.
    """
    with localcontext() as ctx:
        ctx.prec = 28
        ctx.rounding = ROUND_HALF_EVEN

        fv = Decimal(str(face_value)).quantize(Q_MONETARY, rounding=ROUND_HALF_EVEN)
        annual_rate = Decimal(str(annual_discount_rate))
        pu_base = Decimal(str(initial_quota_pu)).quantize(Q_INTERMEDIATE, rounding=ROUND_HALF_EVEN)

        # Taxa efetiva diária: (1 + i_a)^(1/252) - 1 em NUMERIC(18,8)
        one_plus_annual = Decimal("1") + annual_rate
        # Cálculo exato de potência fracionária em Decimal via ln/exp
        daily_compound = (one_plus_annual.ln() / Decimal("252")).exp()
        daily_rate = (daily_compound - Decimal("1")).quantize(Q_INTERMEDIATE, rounding=ROUND_HALF_EVEN)

        # Fator de desconto Pro-Rata no período: 1 / (1 + daily_rate)^business_days
        accumulated_factor = (Decimal("1") + daily_rate) ** Decimal(business_days)
        discount_factor = (Decimal("1") / accumulated_factor).quantize(
            Q_INTERMEDIATE, rounding=ROUND_HALF_EVEN
        )

        # Preço Unitário (PU) atualizado da cota em NUMERIC(18,8)
        updated_quota_pu = (pu_base * accumulated_factor).quantize(
            Q_INTERMEDIATE, rounding=ROUND_HALF_EVEN
        )

        # Liquidação financeira final em NUMERIC(15,2) com ROUND_HALF_EVEN
        net_settlement = (fv * discount_factor).quantize(Q_MONETARY, rounding=ROUND_HALF_EVEN)

        return {
            "face_value": fv,
            "daily_rate": daily_rate,
            "discount_factor": discount_factor,
            "quota_pu": updated_quota_pu,
            "net_settlement": net_settlement,
        }

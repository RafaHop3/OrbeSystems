#!/usr/bin/env python3
"""
scripts/provision_stripe_plans.py — Orbe Systems & INHO
═══════════════════════════════════════════════════════════════════════════════
Provisionador Oficial dos Planos de Assinatura no Stripe:
  1. Produto: 'INHO Essencial'
     - Preço Mensal: R$ 290,00 (29.000 centavos BRL)
     - Preço Anual: R$ 2.900,00 (290.000 centavos BRL — 2 Meses Grátis)
  2. Produto: 'INHO Pro + IA'
     - Preço Mensal: R$ 590,00 (59.000 centavos BRL)
     - Preço Anual: R$ 5.900,00 (590.000 centavos BRL — 2 Meses Grátis)
  3. Produto: 'INHO Cooperativa & Enterprise'
     - Preço Mensal: R$ 990,00 (99.000 centavos BRL)
     - Preço Anual: R$ 9.900,00 (990.000 centavos BRL — 2 Meses Grátis)
  4. Webhook Endpoint:
     - URL: https://api.orbesystems.com.br/api/v1/billing/webhook
     - Eventos: checkout.session.completed, customer.subscription.updated, invoice.payment_succeeded

Atualiza automaticamente os arquivos .env de inho_backend, backend e raiz.
═══════════════════════════════════════════════════════════════════════════════
"""

import os
import sys
import json
if hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass
import argparse
import uuid
from typing import Dict, Any, Optional

try:
    import stripe
    HAS_STRIPE_SDK = True
except ImportError:
    HAS_STRIPE_SDK = False

WEBHOOK_URL_DEFAULT = "https://api.orbesystems.com.br/api/v1/billing/webhook"
ENABLED_EVENTS = [
    "checkout.session.completed",
    "customer.subscription.updated",
    "invoice.payment_succeeded",
]

PLAN_DEFINITIONS = [
    {
        "tier": "INHO_ESSENCIAL",
        "name": "INHO Essencial",
        "description": "INHO Essencial (PME & Serviços) — Core ERP, até 3 operadores, PDV, Contratos, Boletos/PIX e Central WhatsApp.",
        "monthly_cents": 29000,
        "annual_cents": 290000,
        "env_monthly": "STRIPE_PRICE_ID_ESSENCIAL_MONTHLY",
        "env_annual": "STRIPE_PRICE_ID_ESSENCIAL_ANNUAL",
        "env_legacy": "STRIPE_PRICE_ID_ESSENCIAL",
    },
    {
        "tier": "INHO_PRO_IA",
        "name": "INHO Pro + IA",
        "description": "INHO Pro + OrBrick-IA (CBM & RAG) — Core completo, até 8 operadores, Alçada Dual-Control, OrBrick-IA Ativa, RAG até 25 chunks.",
        "monthly_cents": 59000,
        "annual_cents": 590000,
        "env_monthly": "STRIPE_PRICE_ID_PRO_IA_MONTHLY",
        "env_annual": "STRIPE_PRICE_ID_PRO_IA_ANNUAL",
        "env_legacy": "STRIPE_PRICE_ID_PRO_IA",
    },
    {
        "tier": "INHO_COOPERATIVA_OURO",
        "name": "INHO Cooperativa & Enterprise",
        "description": "INHO Cooperativa & Enterprise (Padrão Ouro) — Módulo Cooperativismo BACEN, até 25 operadores, Quadro Social, Cotas-Partes, Open Finance Sicoob/Sicredi.",
        "monthly_cents": 99000,
        "annual_cents": 990000,
        "env_monthly": "STRIPE_PRICE_ID_COOPERATIVA_OURO_MONTHLY",
        "env_annual": "STRIPE_PRICE_ID_COOPERATIVA_OURO_ANNUAL",
        "env_legacy": "STRIPE_PRICE_ID_COOPERATIVA_OURO",
    },
]


def update_env_file(file_path: str, updates: Dict[str, str]) -> None:
    """Atualiza ou cria chaves no arquivo .env preservando comentários e ordem."""
    existing_lines = []
    if os.path.exists(file_path):
        with open(file_path, "r", encoding="utf-8") as f:
            existing_lines = f.readlines()

    keys_found = set()
    new_lines = []

    for line in existing_lines:
        stripped = line.strip()
        if stripped and not stripped.startswith("#") and "=" in stripped:
            k = stripped.split("=", 1)[0].strip()
            if k in updates:
                new_lines.append(f"{k}={updates[k]}\n")
                keys_found.add(k)
                continue
        new_lines.append(line)

    for k, v in updates.items():
        if k not in keys_found:
            if new_lines and not new_lines[-1].endswith("\n"):
                new_lines.append("\n")
            new_lines.append(f"{k}={v}\n")

    os.makedirs(os.path.dirname(os.path.abspath(file_path)), exist_ok=True)
    with open(file_path, "w", encoding="utf-8") as f:
        f.writelines(new_lines)


def provision_live(secret_key: str, webhook_url: str) -> Dict[str, Any]:
    """Provisiona produtos, preços e webhook endpoint via SDK stripe."""
    if not HAS_STRIPE_SDK:
        raise RuntimeError("Biblioteca 'stripe' não está instalada no ambiente Python.")

    stripe.api_key = secret_key
    print(f"[*] Conectando à API do Stripe com a chave fornecida...")

    # Buscar produtos existentes para idempotência
    existing_products = stripe.Product.list(limit=50)
    prod_map_by_name = {p.name.strip().lower(): p for p in existing_products.data}

    # Buscar webhooks existentes
    existing_webhooks = stripe.WebhookEndpoint.list(limit=20)
    existing_wh = next((wh for wh in existing_webhooks.data if wh.url == webhook_url), None)

    results = {
        "products": {},
        "prices": {},
        "webhook": {},
        "env_vars": {}
    }

    results["env_vars"]["STRIPE_SECRET_KEY"] = secret_key

    for plan in PLAN_DEFINITIONS:
        name_key = plan["name"].strip().lower()
        product = prod_map_by_name.get(name_key)

        if not product:
            print(f"[+] Criando Produto: {plan['name']}")
            product = stripe.Product.create(
                name=plan["name"],
                description=plan["description"],
                metadata={"tier": plan["tier"], "system": "inho_orbe"},
            )
        else:
            print(f"[=] Produto existente encontrado: {plan['name']} (ID: {product.id})")

        prod_id = product.id
        results["products"][plan["tier"]] = prod_id

        # Preço Mensal
        print(f"  [+] Provisionando Preço Mensal: R$ {plan['monthly_cents']/100:.2f}")
        price_monthly = stripe.Price.create(
            product=prod_id,
            unit_amount=plan["monthly_cents"],
            currency="brl",
            recurring={"interval": "month"},
            metadata={"tier": plan["tier"], "billing_cycle": "MONTHLY"},
        )

        # Preço Anual
        print(f"  [+] Provisionando Preço Anual: R$ {plan['annual_cents']/100:.2f} (2 Meses Grátis)")
        price_annual = stripe.Price.create(
            product=prod_id,
            unit_amount=plan["annual_cents"],
            currency="brl",
            recurring={"interval": "year"},
            metadata={"tier": plan["tier"], "billing_cycle": "ANNUAL"},
        )

        results["prices"][f"{plan['tier']}_MONTHLY"] = price_monthly.id
        results["prices"][f"{plan['tier']}_ANNUAL"] = price_annual.id

        results["env_vars"][plan["env_monthly"]] = price_monthly.id
        results["env_vars"][plan["env_annual"]] = price_annual.id
        results["env_vars"][plan["env_legacy"]] = price_monthly.id

    # Webhook Endpoint
    if not existing_wh:
        print(f"[+] Criando Webhook Endpoint: {webhook_url}")
        wh = stripe.WebhookEndpoint.create(
            url=webhook_url,
            enabled_events=ENABLED_EVENTS,
            description="Webhook Oficial Orbe Systems / INHO — Provisionamento de Assinaturas e Reconciliação",
            metadata={"system": "inho_orbe"},
        )
        wh_id = wh.id
        wh_secret = wh.secret
        print(f"    -> Webhook criado: {wh_id} (Segredo: {wh_secret[:10]}...)")
    else:
        print(f"[=] Webhook existente encontrado: {existing_wh.id}")
        wh_id = existing_wh.id
        wh_secret = getattr(existing_wh, "secret", "") or os.getenv("STRIPE_WEBHOOK_SECRET", "")

    results["webhook"]["id"] = wh_id
    results["webhook"]["url"] = webhook_url
    results["webhook"]["secret"] = wh_secret
    if wh_secret:
        results["env_vars"]["STRIPE_WEBHOOK_SECRET"] = wh_secret

    return results


def provision_mock(secret_key: str, webhook_url: str) -> Dict[str, Any]:
    """Gera IDs mock determinísticos e válidos para testes locais / CI."""
    print("[*] Modo SIMULADO (Mock / Dry-Run) ativado.")
    results = {
        "products": {},
        "prices": {},
        "webhook": {},
        "env_vars": {}
    }

    results["env_vars"]["STRIPE_SECRET_KEY"] = secret_key or "sk_test_mock_inho_live_secret_key"

    for plan in PLAN_DEFINITIONS:
        tier_short = plan["tier"].replace("INHO_", "").lower()
        prod_id = f"prod_{tier_short}_{uuid.uuid4().hex[:8]}"
        price_m_id = f"price_{tier_short}_monthly_{uuid.uuid4().hex[:8]}"
        price_a_id = f"price_{tier_short}_annual_{uuid.uuid4().hex[:8]}"

        results["products"][plan["tier"]] = prod_id
        results["prices"][f"{plan['tier']}_MONTHLY"] = price_m_id
        results["prices"][f"{plan['tier']}_ANNUAL"] = price_a_id

        results["env_vars"][plan["env_monthly"]] = price_m_id
        results["env_vars"][plan["env_annual"]] = price_a_id
        results["env_vars"][plan["env_legacy"]] = price_m_id

    wh_id = f"we_{uuid.uuid4().hex[:14]}"
    wh_secret = f"whsec_{uuid.uuid4().hex[:32]}"
    results["webhook"]["id"] = wh_id
    results["webhook"]["url"] = webhook_url
    results["webhook"]["secret"] = wh_secret
    results["env_vars"]["STRIPE_WEBHOOK_SECRET"] = wh_secret

    return results


def main():
    parser = argparse.ArgumentParser(description="Provisionamento Automatizado de Planos e Webhook no Stripe (INHO / Orbe Systems)")
    parser.add_argument("--secret-key", "-k", help="Stripe Secret Key (sk_live_... ou sk_test_...). Default lido de STRIPE_SECRET_KEY")
    parser.add_argument("--webhook-url", "-w", default=WEBHOOK_URL_DEFAULT, help=f"URL do Webhook Stripe (default: {WEBHOOK_URL_DEFAULT})")
    parser.add_argument("--dry-run", "--mock", action="store_true", help="Executa em modo mock / dry-run sem chamar a API remota do Stripe")
    parser.add_argument("--output-json", "-o", default="stripe_provisioned_plans.json", help="Arquivo JSON de saída dos recursos provisionados")
    args = parser.parse_args()

    secret_key = args.secret_key or os.getenv("STRIPE_SECRET_KEY", "")

    is_dry_run = args.dry_run or not secret_key or secret_key.startswith("sk_test_dummy") or secret_key.startswith("CHANGE_ME")

    print("===============================================================================")
    print("      ORBE SYSTEMS — PROVISIONAMENTO DE NOVOS PLANOS STRIPE & WEBHOOK         ")
    print("===============================================================================")
    print(f"Modo: {'MOCK / DRY-RUN' if is_dry_run else 'LIVE STRIPE API'}")
    print(f"Webhook Target: {args.webhook_url}")
    print(f"Eventos Habilitados: {', '.join(ENABLED_EVENTS)}")
    print("-------------------------------------------------------------------------------")

    if is_dry_run:
        results = provision_mock(secret_key, args.webhook_url)
    else:
        results = provision_live(secret_key, args.webhook_url)

    # Atualizar arquivos .env
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    env_paths = [
        os.path.join(base_dir, "inho_backend", ".env"),
        os.path.join(base_dir, "backend", ".env"),
    ]

    print("\n[*] Atualizando arquivos .env com os novos Price IDs e Webhook Secret...")
    for env_path in env_paths:
        if os.path.exists(os.path.dirname(env_path)):
            update_env_file(env_path, results["env_vars"])
            print(f"  [OK] Arquivo atualizado: {env_path}")

    # Salvar JSON de relatório
    json_path = os.path.join(base_dir, args.output_json)
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2, ensure_ascii=False)
    print(f"  [OK] Relatório exportado: {json_path}")

    print("\n===============================================================================")
    print("                     PROVISIONAMENTO CONCLUÍDO COM SUCESSO                     ")
    print("===============================================================================")
    for k, v in results["env_vars"].items():
        print(f"  {k:<42} = {v}")
    print("===============================================================================")


if __name__ == "__main__":
    main()

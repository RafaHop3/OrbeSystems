# ghost_engine/brokers_registry.py
"""
Catálogo Declarativo Oficial de Data Brokers, Bureaus e Agregadores de Dados
Orbe Systems — Ghost Engine v2.0 (Arquitetura Distribuída de Desindexação)
"""
from enum import Enum
from pydantic import BaseModel
from typing import Optional, Dict, List

class RemovalMethod(str, Enum):
    DPO_EMAIL = "DPO_EMAIL"           # Notificação Extrajudicial Art. 18 LGPD via SMTP Auditado
    PLAYWRIGHT_DOM = "PLAYWRIGHT_DOM" # Automação Headless no Portal de Privacidade / Formulário
    HTTP_API = "HTTP_API"             # Requisição REST direta no endpoint de Opt-Out

class ConnectorStatus(str, Enum):
    ONLINE = "ONLINE"
    STANDBY = "STANDBY"
    CLOUDFLARE_PROTECTED = "CLOUDFLARE_PROTECTED"

class BrokerTarget(BaseModel):
    id: str
    name: str
    domain: str
    category: str
    method: RemovalMethod
    status: ConnectorStatus = ConnectorStatus.ONLINE
    dpo_email: Optional[str] = None
    optout_url: Optional[str] = None
    selectors: Optional[Dict[str, str]] = None
    sla_days: int = 15 # Prazo legal LGPD

# ── CATÁLOGO REAL DE 50+ DATA BROKERS ─────────────────────────────────────────
BROKERS_CATALOG: List[BrokerTarget] = [
    # ── CATEGORIA 1: AGREGADORES DE CNPJ, SÓCIOS E RECEITA (14 ALVOS) ──────────
    BrokerTarget(
        id="casa_dos_dados",
        name="Casa dos Dados",
        domain="casadosdados.com.br",
        category="Corporate/OSINT",
        method=RemovalMethod.DPO_EMAIL,
        dpo_email="dpo@casadosdados.com.br",
        optout_url="https://casadosdados.com.br/contato",
        status=ConnectorStatus.ONLINE
    ),
    BrokerTarget(
        id="cnpj_biz",
        name="CNPJ Biz",
        domain="cnpj.biz",
        category="Corporate/OSINT",
        method=RemovalMethod.DPO_EMAIL,
        dpo_email="privacidade@cnpj.biz",
        optout_url="https://cnpj.biz/privacidade",
        status=ConnectorStatus.ONLINE
    ),
    BrokerTarget(
        id="consulta_socio",
        name="Consulta Sócio",
        domain="consultasocio.com",
        category="Corporate/OSINT",
        method=RemovalMethod.PLAYWRIGHT_DOM,
        optout_url="https://www.consultasocio.com/remocao",
        status=ConnectorStatus.ONLINE
    ),
    BrokerTarget(
        id="econodata",
        name="Econodata",
        domain="econodata.com.br",
        category="Corporate/OSINT",
        method=RemovalMethod.DPO_EMAIL,
        dpo_email="encarregado@econodata.com.br",
        optout_url="https://www.econodata.com.br/privacidade",
        status=ConnectorStatus.ONLINE
    ),
    BrokerTarget(
        id="empresas_net",
        name="Empresas.net",
        domain="empresas.net.br",
        category="Corporate/OSINT",
        method=RemovalMethod.DPO_EMAIL,
        dpo_email="contato@empresas.net.br",
        status=ConnectorStatus.ONLINE
    ),
    BrokerTarget(
        id="informecadastral",
        name="Informe Cadastral",
        domain="informecadastral.com.br",
        category="Corporate/OSINT",
        method=RemovalMethod.DPO_EMAIL,
        dpo_email="privacidade@informecadastral.com.br",
        status=ConnectorStatus.ONLINE
    ),
    BrokerTarget(
        id="transparencia_cc",
        name="Transparência CC",
        domain="transparencia.cc",
        category="Corporate/OSINT",
        method=RemovalMethod.DPO_EMAIL,
        dpo_email="dpo@transparencia.cc",
        status=ConnectorStatus.ONLINE
    ),
    BrokerTarget(
        id="cnpj_rocks",
        name="CNPJ Rocks",
        domain="cnpj.rocks",
        category="Corporate/OSINT",
        method=RemovalMethod.DPO_EMAIL,
        dpo_email="contato@cnpj.rocks",
        status=ConnectorStatus.ONLINE
    ),
    BrokerTarget(
        id="cadastro_empresa",
        name="Cadastro Empresa",
        domain="cadastroempresa.com.br",
        category="Corporate/OSINT",
        method=RemovalMethod.DPO_EMAIL,
        dpo_email="privacidade@cadastroempresa.com.br",
        status=ConnectorStatus.ONLINE
    ),
    BrokerTarget(
        id="qsa_brasil",
        name="QSA Brasil",
        domain="qsabrasil.com.br",
        category="Corporate/OSINT",
        method=RemovalMethod.DPO_EMAIL,
        dpo_email="dpo@qsabrasil.com.br",
        status=ConnectorStatus.ONLINE
    ),
    BrokerTarget(
        id="hubd",
        name="Hubd Agregador",
        domain="hubd.com.br",
        category="Corporate/OSINT",
        method=RemovalMethod.DPO_EMAIL,
        dpo_email="privacidade@hubd.com.br",
        status=ConnectorStatus.ONLINE
    ),
    BrokerTarget(
        id="situacao_cadastral",
        name="Situação Cadastral",
        domain="situacaocadastral.info",
        category="Corporate/OSINT",
        method=RemovalMethod.DPO_EMAIL,
        dpo_email="contato@situacaocadastral.info",
        status=ConnectorStatus.ONLINE
    ),
    BrokerTarget(
        id="consultas_cnpj",
        name="Consultas CNPJ",
        domain="consultascnpj.com",
        category="Corporate/OSINT",
        method=RemovalMethod.PLAYWRIGHT_DOM,
        optout_url="https://consultascnpj.com/solicitar-exclusao",
        status=ConnectorStatus.ONLINE
    ),
    BrokerTarget(
        id="cenprot",
        name="Cenprot Cartórios",
        domain="cenprot.org.br",
        category="Corporate/OSINT",
        method=RemovalMethod.DPO_EMAIL,
        dpo_email="privacidade@cenprot.org.br",
        status=ConnectorStatus.STANDBY
    ),

    # ── CATEGORIA 2: DIRETÓRIOS JURÍDICOS E DIÁRIOS OFICIAIS (8 ALVOS) ─────────
    BrokerTarget(
        id="jusbrasil",
        name="Jusbrasil",
        domain="jusbrasil.com.br",
        category="Legal",
        method=RemovalMethod.PLAYWRIGHT_DOM,
        optout_url="https://www.jusbrasil.com.br/ajuda/remocao",
        selectors={
            "name_input": "input[name='name']",
            "cpf_input": "input[name='document']",
            "email_input": "input[name='email']",
            "submit_btn": "button[type='submit']"
        },
        status=ConnectorStatus.CLOUDFLARE_PROTECTED
    ),
    BrokerTarget(
        id="escavador",
        name="Escavador",
        domain="escavador.com",
        category="Legal",
        method=RemovalMethod.PLAYWRIGHT_DOM,
        optout_url="https://www.escavador.com/remocao-de-dados",
        selectors={
            "name_input": "input[name='nome']",
            "email_input": "input[name='email']",
            "submit_btn": "button[type='submit']"
        },
        status=ConnectorStatus.ONLINE
    ),
    BrokerTarget(
        id="radar_oficial",
        name="Radar Oficial",
        domain="radaroficial.com.br",
        category="Legal",
        method=RemovalMethod.DPO_EMAIL,
        dpo_email="contato@radaroficial.com.br",
        status=ConnectorStatus.ONLINE
    ),
    BrokerTarget(
        id="digesto",
        name="Digesto (Jusbrasil)",
        domain="digesto.com.br",
        category="Legal",
        method=RemovalMethod.DPO_EMAIL,
        dpo_email="dpo@digesto.com.br",
        status=ConnectorStatus.ONLINE
    ),
    BrokerTarget(
        id="processos_info",
        name="Processos.info",
        domain="processos.info",
        category="Legal",
        method=RemovalMethod.DPO_EMAIL,
        dpo_email="privacidade@processos.info",
        status=ConnectorStatus.ONLINE
    ),
    BrokerTarget(
        id="jusdocs",
        name="JusDocs",
        domain="jusdocs.com",
        category="Legal",
        method=RemovalMethod.DPO_EMAIL,
        dpo_email="dpo@jusdocs.com",
        status=ConnectorStatus.ONLINE
    ),
    BrokerTarget(
        id="diarios_oficiais_br",
        name="Agregador Diários Oficiais",
        domain="diariosoficiais.com.br",
        category="Legal",
        method=RemovalMethod.DPO_EMAIL,
        dpo_email="encarregado@diariosoficiais.com.br",
        status=ConnectorStatus.ONLINE
    ),
    BrokerTarget(
        id="tj_notificacoes",
        name="TJ Notificações Jurídicas",
        domain="tjnotificacoes.com.br",
        category="Legal",
        method=RemovalMethod.DPO_EMAIL,
        dpo_email="privacidade@tjnotificacoes.com.br",
        status=ConnectorStatus.STANDBY
    ),

    # ── CATEGORIA 3: BUREAUS DE CRÉDITO, SCORE E COBRANÇA (6 ALVOS) ────────────
    BrokerTarget(
        id="serasa",
        name="Serasa Experian",
        domain="serasa.com.br",
        category="Credit Bureau",
        method=RemovalMethod.DPO_EMAIL,
        dpo_email="dpo@br.experian.com",
        optout_url="https://www.serasaexperian.com.br/protecao-de-dados",
        status=ConnectorStatus.ONLINE
    ),
    BrokerTarget(
        id="boa_vista",
        name="Boa Vista SCPC (Equifax)",
        domain="boavistaservicos.com.br",
        category="Credit Bureau",
        method=RemovalMethod.DPO_EMAIL,
        dpo_email="dpo@boavistaservicos.com.br",
        optout_url="https://www.consumidorpositivo.com.br/atendimento",
        status=ConnectorStatus.ONLINE
    ),
    BrokerTarget(
        id="quod",
        name="Quod (Gestora de Inteligência de Crédito)",
        domain="quod.com.br",
        category="Credit Bureau",
        method=RemovalMethod.DPO_EMAIL,
        dpo_email="privacidade@quod.com.br",
        status=ConnectorStatus.ONLINE
    ),
    BrokerTarget(
        id="acordo_certo",
        name="Acordo Certo",
        domain="acordocerto.com.br",
        category="Credit Bureau",
        method=RemovalMethod.DPO_EMAIL,
        dpo_email="dpo@acordocerto.com.br",
        status=ConnectorStatus.ONLINE
    ),
    BrokerTarget(
        id="spc_brasil",
        name="SPC Brasil (CNDL)",
        domain="spcbrasil.org.br",
        category="Credit Bureau",
        method=RemovalMethod.DPO_EMAIL,
        dpo_email="encarregadolgpd@spcbrasil.org.br",
        status=ConnectorStatus.ONLINE
    ),
    BrokerTarget(
        id="assertiva",
        name="Assertiva Soluções",
        domain="assertivasolucoes.com.br",
        category="Credit Bureau",
        method=RemovalMethod.DPO_EMAIL,
        dpo_email="dpo@assertivasolucoes.com.br",
        status=ConnectorStatus.ONLINE
    ),

    # ── CATEGORIA 4: DATA BROKERS B2B / ENRIQUECIMENTO DE LEADS (10 ALVOS) ────
    BrokerTarget(
        id="neoway",
        name="Neoway B3",
        domain="neoway.com.br",
        category="Big Data Broker",
        method=RemovalMethod.DPO_EMAIL,
        dpo_email="dpo@neoway.com.br",
        status=ConnectorStatus.ONLINE
    ),
    BrokerTarget(
        id="bigdatacorp",
        name="BigDataCorp",
        domain="bigdatacorp.com.br",
        category="Big Data Broker",
        method=RemovalMethod.DPO_EMAIL,
        dpo_email="privacidade@bigdatacorp.com.br",
        status=ConnectorStatus.ONLINE
    ),
    BrokerTarget(
        id="lusha",
        name="Lusha Systems",
        domain="lusha.com",
        category="Global Lead Broker",
        method=RemovalMethod.PLAYWRIGHT_DOM,
        optout_url="https://www.lusha.com/privacy-center/opt-out/",
        status=ConnectorStatus.ONLINE
    ),
    BrokerTarget(
        id="apollo_io",
        name="Apollo.io",
        domain="apollo.io",
        category="Global Lead Broker",
        method=RemovalMethod.PLAYWRIGHT_DOM,
        optout_url="https://www.apollo.io/privacy-policy/remove",
        status=ConnectorStatus.ONLINE
    ),
    BrokerTarget(
        id="rocketreach",
        name="RocketReach",
        domain="rocketreach.co",
        category="Global Lead Broker",
        method=RemovalMethod.PLAYWRIGHT_DOM,
        optout_url="https://rocketreach.co/remove",
        status=ConnectorStatus.ONLINE
    ),
    BrokerTarget(
        id="zoominfo",
        name="ZoomInfo",
        domain="zoominfo.com",
        category="Global Lead Broker",
        method=RemovalMethod.PLAYWRIGHT_DOM,
        optout_url="https://www.zoominfo.com/about-zoominfo/privacy-manage-profile",
        status=ConnectorStatus.ONLINE
    ),
    BrokerTarget(
        id="cognism",
        name="Cognism",
        domain="cognism.com",
        category="Global Lead Broker",
        method=RemovalMethod.DPO_EMAIL,
        dpo_email="privacy@cognism.com",
        status=ConnectorStatus.ONLINE
    ),
    BrokerTarget(
        id="kaspr",
        name="Kaspr Lead Engine",
        domain="kaspr.io",
        category="Global Lead Broker",
        method=RemovalMethod.DPO_EMAIL,
        dpo_email="dpo@kaspr.io",
        status=ConnectorStatus.ONLINE
    ),
    BrokerTarget(
        id="leadiq",
        name="LeadIQ",
        domain="leadiq.com",
        category="Global Lead Broker",
        method=RemovalMethod.PLAYWRIGHT_DOM,
        optout_url="https://leadiq.com/opt-out",
        status=ConnectorStatus.ONLINE
    ),
    BrokerTarget(
        id="hunter_io",
        name="Hunter.io",
        domain="hunter.io",
        category="Global Lead Broker",
        method=RemovalMethod.HTTP_API,
        optout_url="https://hunter.io/claim-domain",
        status=ConnectorStatus.ONLINE
    ),

    # ── CATEGORIA 5: LISTAS TELEFÔNICAS E IDENTIFICADORES (8 ALVOS) ───────────
    BrokerTarget(
        id="telelistas",
        name="TeleListas",
        domain="telelistas.net",
        category="Directory",
        method=RemovalMethod.DPO_EMAIL,
        dpo_email="privacidade@telelistas.net",
        status=ConnectorStatus.ONLINE
    ),
    BrokerTarget(
        id="guiamais",
        name="GuiaMais",
        domain="guiamais.com.br",
        category="Directory",
        method=RemovalMethod.DPO_EMAIL,
        dpo_email="lgpd@guiamais.com.br",
        status=ConnectorStatus.ONLINE
    ),
    BrokerTarget(
        id="solutudo",
        name="Solutudo",
        domain="solutudo.com.br",
        category="Directory",
        method=RemovalMethod.DPO_EMAIL,
        dpo_email="privacidade@solutudo.com.br",
        status=ConnectorStatus.ONLINE
    ),
    BrokerTarget(
        id="truecaller",
        name="Truecaller",
        domain="truecaller.com",
        category="Caller ID",
        method=RemovalMethod.PLAYWRIGHT_DOM,
        optout_url="https://www.truecaller.com/unlisting",
        status=ConnectorStatus.ONLINE
    ),
    BrokerTarget(
        id="102busca",
        name="102 Busca Telefônica",
        domain="102busca.com.br",
        category="Directory",
        method=RemovalMethod.DPO_EMAIL,
        dpo_email="contato@102busca.com.br",
        status=ConnectorStatus.ONLINE
    ),
    BrokerTarget(
        id="apontador",
        name="Apontador Local",
        domain="apontador.com.br",
        category="Directory",
        method=RemovalMethod.DPO_EMAIL,
        dpo_email="privacidade@apontador.com.br",
        status=ConnectorStatus.ONLINE
    ),
    BrokerTarget(
        id="guiatel",
        name="GuiaTel Cadastral",
        domain="guiatel.com.br",
        category="Directory",
        method=RemovalMethod.DPO_EMAIL,
        dpo_email="dpo@guiatel.com.br",
        status=ConnectorStatus.ONLINE
    ),
    BrokerTarget(
        id="acheiaqui",
        name="AcheiAqui Diretório",
        domain="acheiaqui.com.br",
        category="Directory",
        method=RemovalMethod.DPO_EMAIL,
        dpo_email="privacidade@acheiaqui.com.br",
        status=ConnectorStatus.ONLINE
    ),

    # ── CATEGORIA 6: BUSCADORES DE PESSOAS E OSINT GLOBAL (8 ALVOS) ───────────
    BrokerTarget(
        id="spokeo",
        name="Spokeo People Search",
        domain="spokeo.com",
        category="People Search",
        method=RemovalMethod.PLAYWRIGHT_DOM,
        optout_url="https://www.spokeo.com/optout",
        status=ConnectorStatus.ONLINE
    ),
    BrokerTarget(
        id="beenverified",
        name="BeenVerified",
        domain="beenverified.com",
        category="People Search",
        method=RemovalMethod.PLAYWRIGHT_DOM,
        optout_url="https://www.beenverified.com/f/optout/search",
        status=ConnectorStatus.ONLINE
    ),
    BrokerTarget(
        id="whitepages",
        name="Whitepages Global",
        domain="whitepages.com",
        category="People Search",
        method=RemovalMethod.PLAYWRIGHT_DOM,
        optout_url="https://www.whitepages.com/suppression-requests",
        status=ConnectorStatus.ONLINE
    ),
    BrokerTarget(
        id="radaris",
        name="Radaris Record Search",
        domain="radaris.com",
        category="People Search",
        method=RemovalMethod.PLAYWRIGHT_DOM,
        optout_url="https://radaris.com/control/privacy",
        status=ConnectorStatus.ONLINE
    ),
    BrokerTarget(
        id="intelius",
        name="Intelius Background",
        domain="intelius.com",
        category="People Search",
        method=RemovalMethod.PLAYWRIGHT_DOM,
        optout_url="https://www.intelius.com/opt-out/submit",
        status=ConnectorStatus.ONLINE
    ),
    BrokerTarget(
        id="peekyou",
        name="PeekYou Profiler",
        domain="peekyou.com",
        category="People Search",
        method=RemovalMethod.PLAYWRIGHT_DOM,
        optout_url="https://www.peekyou.com/about/contact/optout/index.php",
        status=ConnectorStatus.ONLINE
    ),
    BrokerTarget(
        id="fastpeoplesearch",
        name="FastPeopleSearch",
        domain="fastpeoplesearch.com",
        category="People Search",
        method=RemovalMethod.PLAYWRIGHT_DOM,
        optout_url="https://www.fastpeoplesearch.com/removal",
        status=ConnectorStatus.ONLINE
    ),
    BrokerTarget(
        id="numlookup",
        name="NumLookup Intelligence",
        domain="numlookup.com",
        category="People Search",
        method=RemovalMethod.PLAYWRIGHT_DOM,
        optout_url="https://www.numlookup.com/opt-out",
        status=ConnectorStatus.ONLINE
    ),
]

def get_broker_by_id(broker_id: str) -> Optional[BrokerTarget]:
    for b in BROKERS_CATALOG:
        if b.id == broker_id:
            return b
    return None

def get_brokers_by_category(category: str) -> List[BrokerTarget]:
    return [b for b in BROKERS_CATALOG if b.category.lower() == category.lower()]

def get_catalog_stats() -> dict:
    total = len(BROKERS_CATALOG)
    methods = {}
    categories = {}
    for b in BROKERS_CATALOG:
        methods[b.method.value] = methods.get(b.method.value, 0) + 1
        categories[b.category] = categories.get(b.category, 0) + 1
    return {
        "total_targets": total,
        "by_method": methods,
        "by_category": categories
    }

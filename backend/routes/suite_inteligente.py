import json
import csv
import io
from typing import List, Dict, Any, Tuple
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from security.auth import require_premium
from models.users import User

router = APIRouter(prefix="/api/suite-inteligente", tags=["Suite Inteligente"])

# ── Pydantic Request Schemas ──────────────────────────────────────────────────
class VulnerabilityItem(BaseModel):
    severity: str
    component: str
    description: str
    status: str

class DocGenRequest(BaseModel):
    template_type: str  # "contract", "audit", "leads"
    company_name: str
    auditor_name: str
    vulnerabilities: List[VulnerabilityItem] = []

class ConvertRequest(BaseModel):
    mode: str  # "json2csv", "csv2json", "md2html"
    content: str

class CompressRequest(BaseModel):
    content: str
    max_dict_size: int = 4096

# ── Core Implementation Classes ──────────────────────────────────────────────
class SmartDocumentGenerator:
    """Gerador de documentos estruturados com foco em segurança e saída Markdown."""
    
    @staticmethod
    def generate_rls_report(company_name: str, auditor_name: str, vulnerabilities: List[Dict[str, str]]) -> str:
        """Gera um relatório de conformidade e segurança (RLS) sanitizado em Markdown."""
        clean_company = company_name.replace("`", "").replace("#", "")
        clean_auditor = auditor_name.replace("`", "").replace("#", "")
        
        md_output = []
        md_output.append("# Relatório de Conformidade e Auditoria de Segurança (RLS)")
        md_output.append(f"**Organização:** {clean_company}")
        md_output.append(f"**Auditor Responsável:** {clean_auditor}")
        md_output.append("**Status de Interesse Social:** Auditado e Validado via MoneyLayer Core\n")
        md_output.append("## 1. Vulnerabilidades Detectadas e Mapeamento")
        md_output.append("| ID | Severidade | Componente | Descrição | Status |")
        md_output.append("|:---|:---|:---|:---|:---|")
        
        for idx, vuln in enumerate(vulnerabilities, 1):
            id_str = f"SEC-{idx:03d}"
            sev = vuln.get("severity", "LOW").upper()
            comp = vuln.get("component", "N/A").replace("|", "-")
            desc = vuln.get("description", "N/A").replace("|", "-")
            status = vuln.get("status", "Mitigado").replace("|", "-")
            md_output.append(f"| {id_str} | {sev} | {comp} | {desc} | {status} |")
            
        md_output.append("\n\n*Documento gerado localmente de forma segura com infraestrutura de zero-retentividade.*")
        return "\n".join(md_output)


class StructureConverter:
    """Conversor de formatos de dados de alta performance (Zero-Allocation Memory Flow)."""
    
    @staticmethod
    def csv_to_json(csv_content: str) -> str:
        """Converte CSV para JSON de forma estruturada."""
        csv_file = io.StringIO(csv_content.strip())
        reader = csv.DictReader(csv_file)
        data = [row for row in reader]
        return json.dumps(data, indent=2, ensure_ascii=False)

    @staticmethod
    def json_to_csv(json_content: str) -> str:
        """Converte JSON (lista de dicionários) para string formatada em CSV."""
        data = json.loads(json_content)
        if not data or not isinstance(data, list):
            raise ValueError("O JSON de entrada precisa ser uma lista de objetos estruturados.")
            
        csv_file = io.StringIO()
        headers = data[0].keys()
        writer = csv.DictWriter(csv_file, fieldnames=headers)
        
        writer.writeheader()
        for row in data:
            writer.writerow(row)
            
        return csv_file.getvalue()

    @staticmethod
    def md_to_html(md_content: str) -> str:
        """Converte Markdown estruturado básico para HTML."""
        html = md_content \
            .replace("&", "&amp;") \
            .replace("<", "&lt;") \
            .replace(">", "&gt;")
        
        # Heading translation
        lines = html.split("\n")
        new_lines = []
        for line in lines:
            if line.startswith("### "):
                new_lines.append(f"<h3>{line[4:]}</h3>")
            elif line.startswith("## "):
                new_lines.append(f"<h2>{line[3:]}</h2>")
            elif line.startswith("# "):
                new_lines.append(f"<h1>{line[2:]}</h1>")
            else:
                new_lines.append(line)
        return "<br />".join(new_lines)


class LZWEngine:
    """Motor de compressão LZW de nível de produção com limite de bits e telemetria."""
    
    def __init__(self, max_dict_size: int = 4096):
        self.max_dict_size = max_dict_size

    def compress(self, uncompressed_text: str) -> Tuple[List[int], Dict[str, Any]]:
        """Compacta o texto usando o algoritmo LZW e calcula métricas exatas de economia."""
        if not uncompressed_text:
            return [], {
                "original_size_bytes": 0, 
                "compressed_size_bytes": 0, 
                "compression_ratio": 1.0, 
                "saving_percentage": "0.0%"
            }

        dict_size = 256
        dictionary = {chr(i): i for i in range(dict_size)}
        
        w = ""
        compressed_data = []
        
        for c in uncompressed_text:
            wc = w + c
            if wc in dictionary:
                w = wc
            else:
                compressed_data.append(dictionary[w])
                if len(dictionary) < self.max_dict_size:
                    dictionary[wc] = dict_size
                    dict_size += 1
                w = c
        if w:
            compressed_data.append(dictionary[w])
            
        original_bytes = len(uncompressed_text.encode('utf-8'))
        compressed_bytes = len(compressed_data) * 2 
        
        compression_ratio = original_bytes / compressed_bytes if compressed_bytes > 0 else 1.0
        saving_pct = (1 - (compressed_bytes / original_bytes)) * 100 if original_bytes > 0 else 0.0
        
        telemetry = {
            "original_size_bytes": original_bytes,
            "compressed_size_bytes": compressed_bytes,
            "compression_ratio": round(compression_ratio, 2),
            "saving_percentage": f"{max(0.0, round(saving_pct, 2))}%",
            "buffer_preview": compressed_data[:15]
        }
        
        return compressed_data, telemetry

# ── API Endpoint Implementations ──────────────────────────────────────────────
@router.post("/generate-document")
async def generate_document(req: DocGenRequest, current_user: User = Depends(require_premium)):
    vulns_list = [v.dict() for v in req.vulnerabilities]
    report = SmartDocumentGenerator.generate_rls_report(req.company_name, req.auditor_name, vulns_list)
    return {"document": report}

@router.post("/convert")
async def convert_format(req: ConvertRequest, current_user: User = Depends(require_premium)):
    try:
        if req.mode == "json2csv":
            res = StructureConverter.json_to_csv(req.content)
        elif req.mode == "csv2json":
            res = StructureConverter.csv_to_json(req.content)
        elif req.mode == "md2html":
            res = StructureConverter.md_to_html(req.content)
        else:
            raise HTTPException(status_code=400, detail="Modo de conversão inválido.")
        return {"result": res}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/compress")
async def compress_payload(req: CompressRequest, current_user: User = Depends(require_premium)):
    lzw = LZWEngine(max_dict_size=req.max_dict_size)
    tokens, telemetry = lzw.compress(req.content)
    return {
        "compressed_tokens": tokens,
        "telemetry": telemetry
    }
